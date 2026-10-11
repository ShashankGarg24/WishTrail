const express=require('express');
const request=require('supertest');
jest.mock('../../middleware/auth',()=>({protect:(req,res,next)=>{if(!req.headers['x-test-user'])return res.status(401).json({success:false});req.user={id:req.headers['x-test-user']};next()}}));
jest.mock('../weeklyTrailService',()=>({current:jest.fn(),markSeen:jest.fn()}));
const service=require('../weeklyTrailService');
const app=express();app.use(express.json());app.use('/weekly-trail',require('../../routes/weeklyTrailRoutes'));

describe('Weekly Trail runtime routes',()=>{
  beforeEach(()=>jest.clearAllMocks());
  test('requires authentication',()=>request(app).get('/weekly-trail/current').expect(401));
  test('current uses the authenticated owner and private caching',async()=>{
    service.current.mockResolvedValue({available:false,reason:'NOT_IN_WINDOW'});
    const response=await request(app).get('/weekly-trail/current?userId=999').set('x-test-user','1').expect(200);
    expect(service.current).toHaveBeenCalledWith({id:'1'},{includeSeen:false});
    expect(response.headers['cache-control']).toBe('private, no-store');
  });
  test('detail recalculation can include a seen recap during its window',async()=>{
    service.current.mockResolvedValue({available:true});
    await request(app).get('/weekly-trail/current?includeSeen=true').set('x-test-user','1').expect(200);
    expect(service.current).toHaveBeenCalledWith({id:'1'},{includeSeen:true});
  });
  test('seen accepts only a period key in the body',async()=>{
    service.markSeen.mockResolvedValue({seen:true,periodKey:'2026-W41'});
    await request(app).post('/weekly-trail/current/seen').set('x-test-user','1').send({periodKey:'2026-W41'}).expect(200);
    expect(service.markSeen).toHaveBeenCalledWith({id:'1'},'2026-W41');
  });
  test('history and historical detail endpoints are absent',async()=>{
    await request(app).get('/weekly-trail/history').set('x-test-user','1').expect(404);
    await request(app).get('/weekly-trail/2026-W41').set('x-test-user','1').expect(404);
  });
});
