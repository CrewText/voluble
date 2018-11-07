import * as express from "express"
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    /* At this point, we know that an outside service has contacted us with an inbound message
    and that the incoming address is of the format
    https://voluble-server.com/services/plugin-subdir-here/endpoint
    so we can use the plugin subdir to determine what the plugin is and what to do next.
    */
    res.jsend.success(req.baseUrl)
});

module.exports = router;
