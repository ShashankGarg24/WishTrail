jest.mock('../../config/supabase', () => ({ query:jest.fn() }));
jest.mock('../../config/observability', () => ({ logger:{info:jest.fn(),error:jest.fn()} }));
jest.mock('../../models/DailyLogsEntry', () => ({find:jest.fn(() => ({select:() => ({lean:async()=>[]})})),aggregate:jest.fn(async()=>[])}));
const { query } = require('../../config/supabase');
const { periodForDate,periodFromKey,calculateWeek } = require('../weeklyTrailCalculator');
const { getStartOfDayInTimezone } = require('../../utility/timezone');
const service = require('../weeklyTrailService');
const period = periodFromKey('2026-W41');
const goal = {id:'1',title:'Run 10K',created_at:'2026-01-01T00:00:00Z',is_active:true};
const habit = {id:'2',name:'Morning walk',created_at:'2026-10-05T00:00:00Z',frequency:'daily',daily_target_count:1,is_archived:false};
const log = (date,count=1) => ({habit_id:'2',date_key:date,occurred_at:`${date}T12:00:00Z`,status:'done',completion_count:count});
const calc = extra => calculateWeek({period,...extra});

describe('Weekly Trail calendar',()=>{
  test('local Monday and Sunday across UTC boundaries',()=>{
    expect(periodForDate(new Date('2026-10-04T19:00:00Z'),'Asia/Kolkata').periodKey).toBe('2026-W41');
    expect(periodForDate(new Date('2026-10-05T02:00:00Z'),'America/Los_Angeles').periodKey).toBe('2026-W40');
  });
  test('DST weeks have correct UTC start and end, not a fixed 168 hours',()=>{
    const p=periodFromKey('2026-W10','America/New_York');
    const a=getStartOfDayInTimezone(p.startLocalDate,p.timezone);
    const b=getStartOfDayInTimezone('2026-03-09',p.timezone);
    expect((b-a)/3600000).toBe(167);
  });
  test('ISO year boundary and invalid week validation',()=>{
    expect(periodForDate(new Date('2027-01-01T12:00:00Z')).periodKey).toBe('2026-W53');
    expect(()=>periodFromKey('2025-W53')).toThrow('Invalid week');
    expect(()=>periodFromKey('2026-W00')).toThrow();
    expect(()=>periodFromKey('2026-W54')).toThrow();
  });
});
describe('Weekly Trail calculations',()=>{
  test('unique goals, completion deduplication, distinct days, mood-only exclusions',()=>{
    const result=calc({goals:[{...goal,completed_at:'2026-10-06T12:00:00Z'}],updates:[{goal_id:'1',date_key:'2026-10-05',text:'Ran'},{goal_id:'1',date_key:'2026-10-06',text:'Finished'},{goal_id:'9',date_key:'2026-10-07',text:' ',emotion:'great'}]});
    expect(result).toMatchObject({goalsProgressed:1,goalsCompleted:1,activeDays:2,habitConsistency:null,emotionCounts:null});
  });
  test('creation midweek, multiple daily targets, skips and unscheduled days',()=>{
    const result=calc({habits:[{...habit,created_at:'2026-10-07T00:00:00Z',daily_target_count:2,frequency:'custom',days_of_week:[3,5]}],logs:[log('2026-10-07',3),log('2026-10-08'),{...log('2026-10-09'),status:'skipped'}]});
    expect(result).toMatchObject({habitCompletions:2,eligibleScheduledOccurrences:4,habitConsistency:50,activeDays:1});
  });
  test('currently archived habits contribute no eligibility or attention',()=>{
    const result=calc({habits:[{...habit,is_archived:true}],logs:[log('2026-10-05'),log('2026-10-09')]});
    expect(result).toMatchObject({eligibleScheduledOccurrences:0,habitCompletions:0,habitConsistency:null,attention:[]});
  });
  test('freeform schedules are not misses',()=>{
    expect(calc({habits:[{...habit,frequency:'custom',days_of_week:[]}]}).habitConsistency).toBeNull();
  });
  test('legacy schedule gaps do not invent adherence; malformed timestamps fail safely',()=>{
    const result=calc({habits:[{...habit,frequency:null}],logs:[log('2026-10-05'),{...log('2026-10-06'),completion_times_mood:[{timestamp:'bad'}]}]});
    expect(result).toMatchObject({habitCompletions:1,habitConsistency:null,dataQuality:['HABIT_SCHEDULE_UNAVAILABLE']});
  });
  test('canonical timestamps assign completions to local dates',()=>{
    const result=calculateWeek({period:periodFromKey('2026-W41','Asia/Kolkata'),habits:[{...habit,created_at:'2026-10-01T00:00:00Z'}],logs:[{...log('2026-10-04'),completion_times_mood:[{timestamp:'2026-10-04T20:00:00Z'}]}]});
    expect(result.activeDateKeys).toEqual(['2026-10-05']);
  });
  test('biggest win chooses latest completion, then stable ID',()=>{
    const result=calc({goals:[{...goal,id:'2',completed_at:'2026-10-08T12:00:00Z'},{...goal,id:'1',completed_at:'2026-10-08T12:00:00Z'},{...goal,id:'3',completed_at:'2026-10-07T12:00:00Z'}]});
    expect(result.biggestWin.entityId).toBe('1');
    expect(result.biggestWin.titleSnapshot).toBe('Run 10K');
  });
  test('rhythm requires two eligible occurrences and ranks exact adherence then completed count',()=>{
    const result=calc({habits:[habit,{...habit,id:'3',name:'Read',frequency:'custom',days_of_week:[1,2]}],logs:[log('2026-10-05'),{...log('2026-10-05'),habit_id:'3'}]});
    expect(result.strongestRhythm.habitId).toBe('3');
    expect(calc({habits:[{...habit,frequency:'custom',days_of_week:[1]}],logs:[log('2026-10-05')]}).strongestRhythm).toBeNull();
  });
  test('attention capped at two and excludes inactive/completed goals',()=>{
    const result=calc({goals:[goal,{...goal,id:'2'},{...goal,id:'3',is_active:false},{...goal,id:'4',completed_at:'2026-09-01T12:00:00Z'}],habits:[habit],logs:[log('2026-10-05')]});
    expect(result.attention.map(x=>x.entityId)).toEqual(['1','2']);
  });
  test('explicit emotion threshold, journal prose never copied, default habit mood excluded',()=>{
    const checkIns=[1,2,3].map(day=>({createdAt:`2026-10-0${day+4}T12:00:00Z`,mood:'happy',content:'private'}));
    expect(calc({checkIns:checkIns.slice(0,2)}).emotionCounts).toBeNull();
    const result=calc({checkIns});
    expect(result).toMatchObject({emotionCounts:{happy:3},activeDays:0,goalsProgressed:0,habitConsistency:null});
    expect(JSON.stringify(result)).not.toContain('private');
  });
  test('live week only includes elapsed days and changes with new activity',()=>{
    const input={period,habits:[habit],weekInProgress:true,now:new Date('2026-10-06T18:00:00Z')};
    expect(calculateWeek(input)).toMatchObject({habitConsistency:0,eligibleScheduledOccurrences:2});
    expect(calculateWeek({...input,logs:[log('2026-10-05')]})).toMatchObject({habitConsistency:50,activeDays:1});
  });
});
describe('Weekly Trail persistence contracts',()=>{
  beforeEach(()=>{ query.mockReset(); jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00Z')); });
  afterEach(()=>jest.useRealTimers());
  test('stored recap survives title deletion and formula/timezone changes without reading sources',async()=>{
    query.mockResolvedValue({rows:[{id:'8',recap:{periodKey:'2026-W41',formulaVersion:1,biggestWin:{titleSnapshot:'Original title'}},timezone_at_finalization:'Asia/Kolkata'}]});
    const result=await service.getWeek({id:'1',timezone:'America/New_York'},'2026-W41',new Date('2026-10-20'));
    expect(result.biggestWin.titleSnapshot).toBe('Original title');
    expect(result.formulaVersion).toBe(1);expect(query).toHaveBeenCalledTimes(2);
  });
  test('concurrent finalizers use conflict-safe insert and read the winner',async()=>{
    let snapshot=null;
    query.mockImplementation(async(sql,values)=>{
      if(sql.startsWith('SELECT * FROM weekly_trail_snapshots'))return {rows:snapshot?[snapshot]:[]};
      if(sql.includes('INSERT INTO weekly_trail_snapshots')){
        expect(sql).toContain('ON CONFLICT(user_id,period_key) DO NOTHING');
        if(snapshot)return {rows:[]};
        snapshot={id:'9',recap:JSON.parse(values[6])};return {rows:[snapshot]};
      }
      if(sql.includes('FROM goals g'))return {rows:[{...goal,completed_at:'2026-10-06T12:00:00Z'}]};
      return {rows:[]};
    });
    const user={id:'1',timezone:'UTC'};
    const [a,b]=await Promise.all([service.finalizeWeek(user,'2026-W41',new Date('2026-10-20')),service.finalizeWeek(user,'2026-W41',new Date('2026-10-20'))]);
    expect(a.id).toBe(b.id);expect(a.formulaVersion).toBe(3);
    expect(a).not.toHaveProperty('updates');
    expect(await service.finalizeWeek(user,'2026-W41',new Date('2026-10-20'))).toEqual(a);
  });
  test('empty historical weeks are omitted',async()=>{
    query.mockResolvedValue({rows:[]});
    expect(await service.finalizeWeek({id:'1'},'2026-W41',new Date('2026-10-20'))).toBeNull();
    expect(query.mock.calls.some(([sql])=>sql.includes('INSERT'))).toBe(false);
  });
  test('read markers never regress and require an owned snapshot',async()=>{
    query.mockResolvedValue({rows:[]});
    await expect(service.markSeen({id:'1'},'2026-W41')).rejects.toThrow('not found');
    query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT * FROM weekly_trail_snapshots')?[{id:1,recap:{periodKey:'2026-W41'}}]:[]}));
    await service.markSeen({id:'1'},'2026-W41');
    expect(query.mock.calls.at(-1)[0]).toContain('GREATEST');
    expect(query.mock.calls.at(-1)[1]).toEqual(['1','2026-W41']);
  });
  test('current and future weeks cannot be finalized',async()=>{
    query.mockResolvedValue({rows:[]});
    await expect(service.finalizeWeek({id:'1'},'2026-W42',new Date('2026-10-13'))).rejects.toThrow('not complete');
  });
  test('history cursor is bounded, descending and summaries reference one snapshot',async()=>{
    query.mockImplementation(async sql=>({rows:sql.includes('ORDER BY period_key DESC LIMIT')?[{id:1,period_key:'2026-W40',recap:{periodKey:'2026-W40'}},{id:2,period_key:'2026-W39',recap:{periodKey:'2026-W39'}}]:sql.startsWith('SELECT * FROM weekly_trail_snapshots')?[{id:3,recap:{periodKey:'2026-W41'}}]:[]}));
    const result=await service.history({id:'1'},{cursor:'2026-W41',limit:1});
    expect(result.items).toHaveLength(1);expect(result.items[0].id).toBe('1');expect(result.nextCursor).toBe('2026-W40');
    expect(query.mock.calls.some(([sql,args])=>sql.includes('period_key<$2')&&args[1]==='2026-W41'&&args[2]===2)).toBe(true);
  });
});
