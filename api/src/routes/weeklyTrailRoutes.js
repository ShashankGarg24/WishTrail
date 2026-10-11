const router = require('express').Router();
const { protect } = require('../middleware/auth');
const service = require('../services/weeklyTrailService');

router.use(protect);
router.use((req,res,next) => { res.set('Cache-Control','private, no-store'); next(); });
const handle = fn => async (req,res,next) => {
  try { res.json({ success:true,data:await fn(req) }); }
  catch (err) { if (err.statusCode) return res.status(err.statusCode).json({ success:false,message:err.message }); next(err); }
};
router.get('/current', handle(req => service.current(req.user, { includeSeen:req.query.includeSeen === 'true' })));
router.post('/current/seen', handle(req => service.markSeen(req.user, req.body?.periodKey)));
module.exports = router;
