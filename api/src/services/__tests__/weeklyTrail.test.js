jest.mock('../../config/supabase', () => ({ query:jest.fn() }));
jest.mock('../../config/observability', () => ({ logger:{info:jest.fn()} }));
jest.mock('../../models/DailyLogsEntry', () => ({ find:jest.fn(() => ({select:() => ({lean:async()=>[]})})) }));
const { query } = require('../../config/supabase');
const { periodForDate, periodFromKey, calculateWeek } = require('../weeklyTrailCalculator');
const service = require('../weeklyTrailService');

const user={id:'7',timezone:'UTC'};
const period=periodFromKey('2026-W41');
const empty={activeDays:0,goalsCompleted:0,goalProgressEvents:0,habitCompletions:0};
const goal={id:'1',title:'Run 10K',created_at:'2026-01-01T00:00:00Z',is_active:true};
const habit={id:'2',name:'Walk',created_at:'2026-01-01T00:00:00Z',frequency:'daily',daily_target_count:1};
const log=date=>({habit_id:'2',date_key:date,occurred_at:`${date}T12:00:00Z`,status:'done',completion_count:1});

beforeEach(()=>query.mockReset());
afterEach(()=>{ for(const key of Object.keys(process.env)) if(key.startsWith('WEEKLY_TRAIL_')) delete process.env[key] });

describe('calendar and window',()=>{
  test.each([
    ['2026-10-12T12:00:00Z',true],['2026-10-13T12:00:00Z',true],['2026-10-14T12:00:00Z',true],['2026-10-15T12:00:00Z',false]
  ])('%s eligibility',(date,expected)=>expect(service.availability(new Date(date),'UTC').inWindow).toBe(expected));
  test('Monday targets the previous Monday-Sunday',()=>expect(service.previousPeriod(new Date('2026-10-12T12:00:00Z'),'UTC')).toMatchObject({startLocalDate:'2026-10-05',endLocalDate:'2026-10-11',periodKey:'2026-W41'}));
  test('user-local boundaries control the grace window',()=>{
    expect(service.availability(new Date('2026-10-14T19:00:00Z'),'Asia/Kolkata').inWindow).toBe(false);
    expect(service.availability(new Date('2026-10-15T02:00:00Z'),'America/Los_Angeles').inWindow).toBe(true);
  });
  test('a late return receives no missed recap',async()=>expect(service.current(user,{},new Date('2026-10-22T12:00:00Z'))).resolves.toEqual({available:false,reason:'NOT_IN_WINDOW'}));
  test('ISO week calculation remains timezone-aware',()=>expect(periodForDate(new Date('2026-10-04T19:00:00Z'),'Asia/Kolkata').periodKey).toBe('2026-W41'));
});

describe('calculation and qualification',()=>{
  test.each([
    [{...empty,activeDays:2},true],[{...empty,goalsCompleted:1},true],[{...empty,goalProgressEvents:2},true],[{...empty,habitCompletions:3},true],[empty,false]
  ])('qualification %#',(recap,expected)=>expect(service.qualifies(recap)).toBe(expected));
  test('thresholds are configurable',()=>{process.env.WEEKLY_TRAIL_MIN_HABIT_COMPLETIONS='5';expect(service.qualifies({...empty,habitCompletions:3})).toBe(false)});
  test('two meaningful updates on one day remain two progress events',()=>{
    const recap=calculateWeek({period,updates:[{id:1,goal_id:1,date_key:'2026-10-05',text:'First'},{id:2,goal_id:1,date_key:'2026-10-05',text:'Second'}]});
    expect(recap).toMatchObject({goalProgressEvents:2,goalsProgressed:1,activeDays:1});
  });
  test('passive and emotion-only activity do not qualify',()=>{
    const recap=calculateWeek({period,updates:[{goal_id:1,date_key:'2026-10-05',text:' ',emotion:'great'}],checkIns:[{createdAt:'2026-10-06T12:00:00Z',mood:'happy'}]});
    expect(service.qualifies(recap)).toBe(false);expect(recap.activeDays).toBe(0);
  });
  test('emotion summary requires three explicit samples',()=>{
    const make=n=>calculateWeek({period,checkIns:Array.from({length:n},(_,i)=>({createdAt:`2026-10-0${i+5}T12:00:00Z`,mood:'happy'}))});
    expect(make(2).emotionCounts).toBeNull();expect(make(3).emotionCounts).toEqual({happy:3});
  });
  test('completion facts survive unavailable schedule while consistency is omitted',()=>{
    const recap=calculateWeek({period,habits:[{...habit,frequency:null}],logs:[log('2026-10-05'),log('2026-10-06'),log('2026-10-07')]});
    expect(recap).toMatchObject({habitCompletions:3,activeDays:3,habitConsistency:null});expect(service.qualifies(recap)).toBe(true);
  });
  test('zero eligible schedule does not invent consistency',()=>expect(calculateWeek({period,habits:[{...habit,frequency:'custom',days_of_week:[]}]}).habitConsistency).toBeNull());
  test('sparse optional metrics do not break recap',()=>expect(calculateWeek({period})).toMatchObject({biggestWin:null,strongestRhythm:null,emotionCounts:null,attention:[]}));
});

describe('runtime service',()=>{
  const monday=new Date('2026-10-12T12:00:00Z');
  test('seen period is not presented repeatedly',async()=>{
    query.mockResolvedValueOnce({rows:[{last_seen_weekly_trail_period_key:'2026-W41'}]});
    await expect(service.current(user,{},monday)).resolves.toMatchObject({available:false,reason:'ALREADY_SEEN'});
    expect(query).toHaveBeenCalledTimes(1);
  });
  test('inactive week reports NOT_ENOUGH_ACTIVITY and writes nothing',async()=>{
    query.mockResolvedValue({rows:[]});
    await expect(service.current(user,{},monday)).resolves.toMatchObject({available:false,reason:'NOT_ENOUGH_ACTIVITY'});
    expect(query.mock.calls.some(([sql])=>/^\s*(INSERT|DELETE)/i.test(sql))).toBe(false);
    expect(query.mock.calls.some(([sql])=>sql.includes('weekly_trail_snapshots'))).toBe(false);
  });
  test('goal completion alone yields an ephemeral recap',async()=>{
    query.mockImplementation(async sql=>({rows:sql.includes('FROM goals g')?[{...goal,completed_at:'2026-10-06T12:00:00Z'}]:[]}));
    await expect(service.current(user,{includeSeen:true},monday)).resolves.toMatchObject({available:true,periodKey:'2026-W41',recap:{goalsCompleted:1}});
    expect(query.mock.calls.some(([sql])=>/weekly_trail_snapshots|INSERT INTO/i.test(sql))).toBe(false);
  });
  test('mark seen only accepts the currently eligible previous period',async()=>{
    query.mockResolvedValue({rows:[]});
    await expect(service.markSeen(user,'2026-W40',monday)).rejects.toMatchObject({statusCode:404});
    await service.markSeen(user,'2026-W41',monday);
    expect(query.mock.calls[0][0]).toContain('last_seen_weekly_trail_period_key');
  });
});
