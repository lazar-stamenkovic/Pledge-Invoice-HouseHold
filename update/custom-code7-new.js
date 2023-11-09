const http = require("https");

exports.main = async (event, callback) => {
  /*****
    Use inputs to get data from any action in your workflow and use it in your code instead of having to use the HubSpot API.
  *****/
  const line_item_id = event.inputFields['line_item_id'];
  const ns_line_item_id = event.inputFields['ns_line_item_id'];
  const accessToken = process.env.accessToken;

  let get_ns_cust_id = {
    "method": "PATCH",
    "hostname": "api.hubapi.com",
    "port": null,
    "path": `/crm/v3/objects/line_items/${line_item_id}`,
    "headers": {
      "accept": "application/json",
      "content-type": "application/json",
      "authorization": `Bearer ${accessToken}`
    }
  };

  const res = await new Promise(resolve => {
     let get_ns_cust_id_req = http.request(get_ns_cust_id, function (get_ns_cust_id_res) {
      var get_ns_cust_id_chunks = [];

      get_ns_cust_id_res.on("data", function (chunk) {
        get_ns_cust_id_chunks.push(chunk);
      });

      get_ns_cust_id_res.on("end", function () {
        resolve(true)
      });
    });
    get_ns_cust_id_req.write(JSON.stringify({properties: {netsuite_internal_id: ns_line_item_id }}));
    get_ns_cust_id_req.end();
  })
  return res
}
