const http = require("https");

exports.main = async (event, callback) => {
  /*****
    Use inputs to get data from any action in your workflow and use it in your code instead of having to use the HubSpot API.
  *****/
  const household_id = event.inputFields['household_id'];
  const ns_customer_id = event.inputFields['ns_customer_id'];
  const accessToken = process.env.accessToken;

  let get_ns_cust_id = {
    "method": "PATCH",
    "hostname": "api.hubapi.com",
    "port": null,
    "path": `https://api.hubapi.com/crm/v3/objects/2-14113182/${household_id}`,
    "headers": {
      "accept": "application/json",
      "content-type": "application/json",
      "authorization": `Bearer ${accessToken}`
    }
  };

  try {
    const res = await new Promise((resolve, reject) => {
      let get_ns_cust_id_req = http.request(get_ns_cust_id, function (get_ns_cust_id_res) {
        var get_ns_cust_id_chunks = [];

        get_ns_cust_id_res.on("data", function (chunk) {
          get_ns_cust_id_chunks.push(chunk);
        });

        get_ns_cust_id_res.on("end", function () {
          var get_ns_cust_id_body = Buffer.concat(get_ns_cust_id_chunks);
          resolve(get_ns_cust_id_body.toString())
        });
      });
      get_ns_cust_id_req.write(JSON.stringify({properties: {netsuite_company_internal_id: ns_customer_id}}));
      get_ns_cust_id_req.end();
    });
    console.log(res)
    return res
  } catch (e) {
    console.error(e);
    throw e;
  }
}
