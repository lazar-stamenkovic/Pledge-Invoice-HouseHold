const crypto = require('crypto');
const querystring = require('querystring');
const request = require('request');
const axios = require('axios');
const http = require("https");

function ns_auth(method,path){

  /**********Netsuitet***********/
 const BaseURL = `https://4147491-sb1.suitetalk.api.netsuite.com/services/rest/record/v1/${path}`;
 const BaseURLEncoded = encodeURIComponent(BaseURL);

 const TimeStamp = Math.floor(new Date().getTime() / 1000);
 const Nonce = Math.floor(Math.random() * (99999999 - 9999999) + 9999999).toString();
 const ConsumerKey = process.env.CONSUMER_KEY;
 const ConsumerSecret = process.env.CONSUMER_SECRET;
 const TokenID = process.env.TOKEN_ID;
 const TokenSecret = process.env.TOKEN_SECRET;

 // Concatenating and URL Encoding Parameters
 const ConcatenatedParameters = querystring.stringify({
   oauth_consumer_key: ConsumerKey,
   oauth_nonce: Nonce,
   oauth_signature_method: 'HMAC-SHA256',
   oauth_timestamp: TimeStamp,
   oauth_token: TokenID,
   oauth_version: '1.0',
 });
 const ConcatenatedParametersEncoded = encodeURIComponent(ConcatenatedParameters);

 // Prepare Signature
 const SignatureMessage = `${method}&${BaseURLEncoded}&${ConcatenatedParametersEncoded}`;

 // Creating Signature Key
 const SignatureKey = `${ConsumerSecret}&${TokenSecret}`;

 // Create Signature
 const signature = crypto.createHmac('sha256', SignatureKey)
 .update(SignatureMessage)
 .digest('base64');

 // URL Encode the Signature
 const SignatureEncoded = encodeURIComponent(signature);

 // Create Authorization
 const Realm = '4147491_SB1';
 const AuthorizationHeader = `OAuth realm="${Realm}",oauth_consumer_key="${ConsumerKey}",oauth_token="${TokenID}",oauth_signature_method="HMAC-SHA256",oauth_timestamp="${TimeStamp}",oauth_nonce="${Nonce}",oauth_version="1.0",oauth_signature="${SignatureEncoded}"`;
 //console.log(AuthorizationHeader)

 /******************************/
 /**** END Authentification ****/
 /******************************/
 return AuthorizationHeader;
}


exports.main = async (event, callback) => {
  const dealId = event.inputFields['hs_object_id'];
  const line_item_id = event.inputFields['line_item_id'];
  const ns_line_item_id = event.inputFields['ns_line_item_id'];
  const accessToken = process.env.accessToken;

  if (!ns_line_item_id) {
    return callback({
      outputFields: {
        invoice_successfully_created: 'no',
        notification: 'Failed to create the invoice'
      }
    })
  }
  try {
    // Get Invoice Detail
    const ns_path = `invoice/${ns_line_item_id}`;
    const AuthorizationHeader = ns_auth('GET', ns_path);
    const ns_invoice_options = {
      'method': 'GET',
      'url': `https://4147491-sb1.suitetalk.api.netsuite.com/services/rest/record/v1/${ns_path}`,
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': AuthorizationHeader
      }
    };
    const invoice_detail = await new Promise((resolve, reject) => {
      request(ns_invoice_options, function (error, ns_invoice_response) {
        if (error) { return reject(error); }
        try {
          const body = JSON.parse(ns_invoice_response.body)
          resolve(body)
        } catch (e) {
          console.error(e)
          reject(e)
        }
      });
    });
    if (!invoice_detail.tranId) {
      return callback({
        outputFields: {
          invoice_successfully_created: 'no',
          notification: 'Failed to create the invoice'
        }
      })
    }
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

    const res = await new Promise((resolve, reject) => {
      let get_ns_cust_id_req = http.request(get_ns_cust_id, function (get_ns_cust_id_res) {
        var get_ns_cust_id_chunks = [];

        get_ns_cust_id_res.on("data", function (chunk) {
          get_ns_cust_id_chunks.push(chunk);
        });

        get_ns_cust_id_res.on("end", function () {
          resolve(true)
        });
      });
      get_ns_cust_id_req.write(JSON.stringify({properties:
        {
          invoice_successfully_created: 'yes',
          netsuite_invoice_id: invoice_detail.tranId,
          invoice_number:invoice_detail.tranId
        }
      }));
      get_ns_cust_id_req.end();
    })
    callback({
      outputFields: {
        invoice_successfully_created: 'yes',
        notification: 'Invoice has been created'
      }
    })
  } catch (e) {
    console.error(e)
    throw e
  }
}
