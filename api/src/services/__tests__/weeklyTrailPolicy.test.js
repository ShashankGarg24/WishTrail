jest.mock('../../config/supabase', () => ({ query:jest.fn() }));
jest.mock('../../config/observability', () => ({ logger:{info:jest.fn(),error:jest.fn()} }));
jest.mock('../../models/DailyLogsEntry', () => ({find:jest.fn(() => ({select:() => ({lean:async()=>[]} )}))}));
const { query } = require('../../config/supabase');
const { getWeeklyTrailConfig } = require('../../config/weeklyTrail');
const { retentionCutoff, shouldCreateWeeklyTrail, narrativeFor } = require('../weeklyTrailPolicy');
const { calculateWeek, periodFromKey } = require('../weeklyTrailCalculator');
const service = require('../weeklyTrailService');
const now = new Date('2026-10-20T12:00:00Z');
const user = {id:'7',timezone:'UTC'};
const period = periodFromKey('2026-W41');
const base = {activeDays:0,goalsCompleted:0,goalProgressEvents:0,habitCompletions:0};
const saved = {id:'9',period_key:'2026-W41',recap:{...base,...period,goalsCompleted:1,activeDays:1,formulaVersion:1}};

afterEach(()=>{
  for(const name of Object.keys(process.env)) if(name.startsWith('WEEKLY_TRAIL_')) delete process.env[name];
});
describe('qualification policy',()=>{
  test.each([
    [base,false], [{...base,activeDays:1,habitCompletions:1},false],
    [{...base,emotionCounts:{happy:5}},false],
    [{...base,activeDays:2},true], [{...base,goalsCompleted:1},true],
    [{...base,goalProgressEvents:2},true], [{...base,habitCompletions:3},true]
  ])('activity-based qualification %#',(recap,expected)=>expect(shouldCreateWeeklyTrail(recap)).toBe(expected));
  test('goal events count meaningful goal/date occurrences, not mood or duplicate completion',()=>{
    const recap=calculateWeek({period,updates:[
      {goal_id:1,date_key:'2026-10-06',text:'Progress'},
      {goal_id:1,date_key:'2026-10-06',text:'Duplicate'},
      {goal_id:2,date_key:'2026-10-06',text:'Progress'},
      {goal_id:3,date_key:'2026-10-06',emotion:'good'}
    ]});
    expect(recap).toMatchObject({goalProgressEvents:2,goalsProgressed:2,activeDays:1});
    expect(shouldCreateWeeklyTrail(recap)).toBe(true);
  });
  test('thresholds are configurable and invalid values use safe defaults',()=>{
    process.env.WEEKLY_TRAIL_MIN_HABIT_COMPLETIONS='5';
    expect(shouldCreateWeeklyTrail({...base,habitCompletions:3})).toBe(false);
    process.env.WEEKLY_TRAIL_MIN_HABIT_COMPLETIONS='0';
    process.env.WEEKLY_TRAIL_RETENTION_MONTHS='bad';
    expect(getWeeklyTrailConfig()).toMatchObject({retentionMonths:6,qualification:{habitCompletions:3}});
  });
});
describe('calendar-month retention',()=>{
  test.each([
    ['2026-08-31T12:00:00Z','UTC',6,'2026-02-28'],
    ['2024-08-31T12:00:00Z','UTC',6,'2024-02-29'],
    ['2026-10-20T12:00:00Z','UTC',3,'2026-07-20'],
    ['2026-10-20T12:00:00Z','UTC',12,'2025-10-20'],
    ['2026-10-20T12:00:00Z','UTC',18,'2025-04-20'],
    ['2026-03-01T01:00:00Z','America/Los_Angeles',6,'2025-08-28'],
  ])('cutoff for %s in %s (%s months)',(date,zone,months,key)=>expect(retentionCutoff(new Date(date),zone,months)).toBe(key));
  test('configuration controls the cutoff without formula edits',()=>{
    process.env.WEEKLY_TRAIL_RETENTION_MONTHS='12';
    expect(retentionCutoff(now,'UTC')).toBe('2025-10-20');
  });
  test('first recap and comeback narratives omit misleading growth claims',()=>{
    expect(narrativeFor(period,null)).toBe('FIRST_TRAIL');
    expect(narrativeFor(period,periodFromKey('2026-W40'))).toBe('WEEKLY_RECAP');
    expect(narrativeFor(period,periodFromKey('2026-W37'))).toBe('COMEBACK');
  });
});
describe('lazy storage lifecycle',()=>{
  beforeEach(()=>query.mockReset().mockResolvedValue({rows:[]}));
  test('no worker or backfill service remains',()=>{
    expect(service.backfill).toBeUndefined();expect(service.finalizeBatch).toBeUndefined();
  });
  test('no qualifying activity creates no snapshot',async()=>{
    await service.finalizeWeek(user,'2026-W41',now);
    expect(query.mock.calls.some(([sql])=>sql.includes('INSERT'))).toBe(false);
  });
  test('one routine completion or mood-only activity does not persist',async()=>{
    query.mockImplementation(async sql=>({rows:sql.includes('FROM habits h')?[{id:1,name:'Walk',created_at:'2026-10-01T00:00:00Z'}]:sql.includes('FROM habit_logs')?[{habit_id:1,date_key:'2026-10-06',occurred_at:'2026-10-06T12:00:00Z',status:'done',completion_count:1}]:[]}));
    expect(await service.finalizeWeek(user,'2026-W41',now)).toBeNull();
    expect(query.mock.calls.some(([sql])=>sql.includes('INSERT'))).toBe(false);
  });
  test('expiry blocks reads and re-creation before source access',async()=>{
    await expect(service.getWeek(user,'2025-W41',now)).rejects.toMatchObject({statusCode:404});
    expect(query).toHaveBeenCalledTimes(1); // bounded cleanup only
    query.mockClear();
    await expect(service.finalizeWeek(user,'2025-W41',now)).rejects.toMatchObject({statusCode:404});
    expect(query).not.toHaveBeenCalled();
  });
  test('cleanup is owner-scoped, bounded, and deletes no underlying source data',async()=>{
    await service.cleanupExpired(user,now);
    const [sql,args]=query.mock.calls[0];
    expect(sql).toContain('DELETE FROM weekly_trail_snapshots WHERE user_id=$1');
    expect(sql).toContain('LIMIT $3');expect(args).toEqual(['7','2026-04-20',25]);
    expect(sql).not.toMatch(/DELETE FROM (goals|habits|goal_updates|habit_logs)/);
  });
  test('cleanup batch is capped even with large configuration',async()=>{
    process.env.WEEKLY_TRAIL_CLEANUP_BATCH_SIZE='9999';
    await service.cleanupExpired(user,now);
    expect(query.mock.calls[0][1][2]).toBe(100);
  });
  test('snapshot ending exactly on cutoff is retained',async()=>{
    const clock=new Date('2026-10-19T12:00:00Z'); // cutoff Apr 19, Sunday W16
    query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT *')?[{...saved,recap:{...saved.recap,periodKey:'2026-W16'}}]:[]}));
    expect((await service.getWeek(user,'2026-W16',clock)).id).toBe('9');
  });
  test('paginated history reads snapshots only and filters expiry independently of cleanup',async()=>{
    const result=await service.history(user,{cursor:'2026-W41',limit:1},now);
    expect(result.retention).toEqual({months:6,cutoffLocalDate:'2026-04-20'});
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain('end_local_date >= $4');
    expect(query.mock.calls[1][1]).toEqual(['7','2026-W41',2,'2026-04-20']);
  });
  test('current week remains live and performs no snapshot insert',async()=>{
    await service.current(user,now);
    expect(query.mock.calls.some(([sql])=>sql.includes('INSERT'))).toBe(false);
    expect(query.mock.calls.some(([sql])=>sql.includes('period_key=$2'))).toBe(false);
  });
  test.each([false,true])('teaser tolerates missing lifecycle columns; archived=%s',async archived=>{
    query.mockImplementation(async sql=>{
      // Simulate the deployed schema rejecting the previous SQL assumptions.
      if (/g\.is_active|h\.is_active|g\.completed\b|created_at,is_active/.test(sql)) throw new Error('column "is_active" does not exist');
      if (/h\.is_archived\b/.test(sql)) throw new Error('column "h.is_archived" does not exist');
      if (sql.includes('weekly_trail_habit_schedules')) throw new Error('relation does not exist');
      if (sql.includes('FROM habits h')) {
        expect(sql).toContain("COALESCE((to_jsonb(h)->>'is_archived')::boolean, false) AS is_archived");
        return {rows:[{id:1,name:'Walk',created_at:'2026-10-19T00:00:00Z',frequency:'daily',daily_target_count:1,is_archived:archived}]};
      }
      if (sql.includes('FROM habit_logs')) return {rows:[{habit_id:1,date_key:'2026-10-19',occurred_at:'2026-10-19T12:00:00Z',status:'done',completion_count:1}]};
      return {rows:[]};
    });
    const result=await service.teaser(user,now);
    expect(result.state).toBe(archived ? 'NO_DATA' : 'CURRENT');
    expect(result.recap).toMatchObject(archived
      ? {habitCompletions:0,habitConsistency:null,activeDays:0}
      : {habitCompletions:1,habitConsistency:50,activeDays:1});
    expect(query.mock.calls.some(([sql])=>sql.includes('INSERT'))).toBe(false);
  });
  test('history after a long absence only examines the previous week',async()=>{
    await service.history(user,{},now);
    const weekReads=query.mock.calls.filter(([sql])=>sql.includes('period_key=$2'));
    expect(weekReads).toHaveLength(1);expect(weekReads[0][1][1]).toBe('2026-W42');
    expect(query.mock.calls.some(([sql])=>sql.includes('FROM users WHERE is_active'))).toBe(false);
  });
  test('teaser only exposes retained snapshots and retains unread behavior',async()=>{
    query.mockImplementation(async sql=>({rows:sql.includes('ORDER BY period_key DESC LIMIT 1')?[saved]:[]}));
    const result=await service.teaser(user,now);
    expect(result.state).toBe('NEW_RECAP');
    const latest=query.mock.calls.find(([sql])=>sql.includes('ORDER BY period_key DESC LIMIT 1'));
    expect(latest[0]).toContain('end_local_date >= $2');
    expect(latest[1]).toEqual(['7','2026-04-20']);
  });
  test('expired read markers are rejected without exposing stored data',async()=>{
    await expect(service.markSeen(user,'2025-W41',now)).rejects.toMatchObject({statusCode:404});
    expect(query.mock.calls.some(([sql])=>sql.startsWith('UPDATE users'))).toBe(false);
  });
});
