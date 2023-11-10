const crypto = require('crypto');
const querystring = require('querystring');
const request = require('request');
const axios = require('axios');
const hubspot = require('@hubspot/api-client');
var http = require("https");

exports.main = async (event, callback) => {

  const accessToken = process.env.accessToken;
  const dealId = event.inputFields['hs_object_id'];

  //const netsuite_company_internal_id = event.inputFields['netsuite_company_internal_id'];
  //const customer = netsuite_company_internal_id;

  /*******************************************************/
  /*** GET ASSOCIATED HOUSEHOLDNAME FROM A DEAL RECORD ***/
  /*******************************************************/

  try {
      const household_id = await new Promise((resolve, reject) => {
      var options = {
        "method": "GET",
        "hostname": "api.hubapi.com",
        "port": null,
        "path": `/crm/v3/objects/deals/${dealId}?associations=2-14113182&archived=false`,
        "headers": {
          "accept": "application/json",
          "Authorization": `Bearer ${accessToken}`
        }
      };
      var req = http.request(options, function (res) {
        var chunks = [];
        res.on("data", function (chunk) {
          chunks.push(chunk);
        });

        res.on("end", function () {
          var body = Buffer.concat(chunks);
          try {
            const parsed = JSON.parse(body)
            if (
              !parsed || !parsed.associations || !parsed.associations || !parsed.associations.p21959829_households ||
              !parsed.associations.p21959829_households.results ||
              !parsed.associations.p21959829_households.results.length
            ) {
              return reject(`failed to get household id - ${parsed}`)
            }
            console.log(parsed)
            resolve(parsed.associations.p21959829_households.results[0].id)
          } catch (e) {
            console.error(e)
            reject(e)
          }
        });
      });
      req.end();
    })
    const house_hold_detail = await new Promise((resolve, reject) => {
      const p = 'properties';
      const params = `${p}=household_name&${p}=street_address&${p}=phone_number&${p}=netsuite_company_internal_id&archived=false`;

      var ho_options = {
        "method": "GET",
        "hostname": "api.hubapi.com",
        "port": null,
        "path":  `https://api.hubapi.com/crm/v3/objects/2-14113182/${household_id}?${params}`,
        "headers": {
          "accept": "application/json",
          "Authorization": `Bearer ${accessToken}`
        }
      };
      var req = http.request(ho_options, function (res) {
        var chunks = [];

        res.on("data", function (chunk) {
          chunks.push(chunk);
        });

        res.on("end", function () {
          var body = Buffer.concat(chunks);
          const parsed = JSON.parse(body)
          if (!parsed) {
            reject(`failed to get house hold details - ${parsed}`);
          }
          resolve(parsed.properties)
        });
      });
      req.end();
    });
    callback({
      outputFields: {
        household_id: household_id,
        household_name: house_hold_detail.household_name,
        street_address: house_hold_detail.street_address,
        phone_number: house_hold_detail.phone_number
      }
    });
  } catch (e) {
    console.error(e)
    throw e
  }
}
