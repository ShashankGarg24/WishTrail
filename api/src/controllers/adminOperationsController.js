const service = require("../services/adminOperationsService");
const handle = (operation) => async (req, res, next) => {
  try {
    res.json({ success: true, data: await operation(req) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview: handle((req) => service.getOverview(req.query)),
  getUser: handle((req) => service.getUser(req.params.id)),
  setUserStatus: handle((req) =>
    service.setUserStatus(req.params.id, req.body.active),
  ),
  grantPremium: handle((req) =>
    service.grantPremium(req.params.id, req.body.months),
  ),
  revokePremium: handle((req) => service.revokePremium(req.params.id)),
  getGoal: handle((req) => service.getGoal(req.params.id)),
  getHabit: handle((req) => service.getHabit(req.params.id)),
  getReports: handle((req) => service.getReports(req.query)),
  getReport: handle((req) => service.getReport(req.params.id)),
  dismissReport: handle((req) => service.dismissReport(req.params.id)),
};
