const express = require('express');
const request = require('supertest');
jest.mock('../../middleware/auth',()=>({protect:(req,res,next)=>{
  if(!req.headers['x-test-user'])return res.status(401).json({success:false});
  req.user={id:req.headers['x-test-user']};next();
}}));
jest.mock('../weeklyTrailService',()=>({current:jest.fn(),history:jest.fn(),getWeek:jest.fn(),teaser:jest.fn(),markSeen:jest.fn()}));
const service=require('../weeklyTrailService');
const app=express();app.use('/weekly-trail',require('../../routes/weeklyTrailRoutes'));
describe('Weekly Trail route contracts',()=>{
  test('requires authentication',async()=>{await request(app).get('/weekly-trail/current').expect(401)});
  test('uses authenticated owner, never a query user ID; responses are private',async()=>{
    service.current.mockResolvedValue({periodKey:'2026-W41'});
    const res=await request(app).get('/weekly-trail/current?userId=999').set('x-test-user','1').expect(200);
    expect(service.current).toHaveBeenCalledWith({id:'1'});
    expect(res.headers['cache-control']).toBe('private, no-store');
  });
  test('invalid/unavailable weeks preserve status codes',async()=>{
    service.getWeek.mockRejectedValue(Object.assign(new Error('Invalid week'),{statusCode:400}));
    await request(app).get('/weekly-trail/bad').set('x-test-user','1').expect(400);
    service.getWeek.mockRejectedValue(Object.assign(new Error('No retained activity'),{statusCode:404}));
    await request(app).get('/weekly-trail/2026-W41').set('x-test-user','1').expect(404);
  });
});
