const router = require('express').Router();
const { protect } = require('../middleware/auth');
const service = require('../services/weeklyTrailService');
router.use(protect);
router.use((req,res,next) => { res.set('Cache-Control','private, no-store'); next(); });
const handle = fn => async (req,res,next) => {
  try { res.json({ success:true,data:await fn(req) }); }
  catch (err) { if (err.statusCode) return res.status(err.statusCode).json({ success:false,message:err.message }); next(err); }
};
router.get('/current',handle(req => service.current(req.user)));
router.get('/teaser',handle(req => service.teaser(req.user)));
router.get('/history',handle(req => service.history(req.user,req.query)));
router.get('/:periodKey',handle(req => service.getWeek(req.user,req.params.periodKey)));
router.post('/:periodKey/seen',handle(async req => { await service.markSeen(req.user,req.params.periodKey); return { seen:true }; }));
module.exports = router;
