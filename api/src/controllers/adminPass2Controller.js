const campaigns = require("../services/adminCampaignService");
const product = require("../services/adminProductService");
const handle = (action) => async (req, res, next) => {
  try {
    res.json({ success: true, data: await action(req) });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  getRelease: handle(async (req) => {
    const update =
      await require("../services/productUpdateService").getUpdateByVersion(
        req.params.version,
      );
    if (!update)
      throw Object.assign(new Error("Release not found"), { statusCode: 404 });
    return { update };
  }),
  campaignOptions: handle(() => ({ testAddress: campaigns.testAddress() })),
  reviewCampaign: handle((req) =>
    campaigns.review(req.body || {}, req.admin.email),
  ),
  sendCampaign: handle((req) =>
    campaigns.send(req.body || {}, req.admin.email),
  ),
  testCampaign: handle((req) => campaigns.test(req.body || {})),
  getProduct: handle(() => product.get()),
  setMaintenance: handle((req) => product.setMaintenance(req.body || {})),
  setPromotion: handle((req) => product.setPromotion(req.body || {})),
};
