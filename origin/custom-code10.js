/**
Description:
 * 1. Create a household as a customer in Netsuite
 * 2. Get Nestuite record ID of the newly created customer
 * 3. Save the Netusite record ID in Hubspot as a Netsuite Company Internal ID
**/
const crypto = require('crypto');
const querystring = require('querystring');
const request = require('request');
const axios = require('axios');
const hubspot = require('@hubspot/api-client');
var http = require("https");

function extractNSrecordId(url) {
    // Split the URL by slashes
    const parts = url.split('/');
    // Get the last part, which should be the customer ID
    const recordId = parts[parts.length - 1];

    // Validate if the extracted value is a numeric ID
    if (!recordId || isNaN(recordId)) {
        console.error("Invalid URL format. Unable to extract a valid customer ID.");
        return null;
    }

    return recordId;
}

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

  const accessToken = process.env.accessToken;
  const dealId = event.inputFields['hs_object_id'];

  const netsuite_company_internal_id = event.inputFields['netsuite_company_internal_id'];
  const customer = netsuite_company_internal_id;

  /******************************/
  /****** Authentification ******/
  /******************************/

  const BaseURL = 'https://4147491-sb1.suitetalk.api.netsuite.com/services/rest/record/v1/customer/';

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
  const SignatureMessage = `POST&${BaseURLEncoded}&${ConcatenatedParametersEncoded}`;

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


 // console.log(accessToken);


  /******************************/
  /*** END Authentification *****/



  /*******************************************************/
  /*** GET ASSOCIATED HOUSEHOLDNAME FROM A DEAL RECORD ***/
  /*******************************************************/

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

      console.log('Test ====>' + JSON.parse(body).id)
      //console.log(JSON.parse(body).properties.amount);
      let household_id = JSON.parse(body).associations.p21959829_households.results[0].id;
      console.log(household_id);
     // console.log(body.toString());

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
          console.log(body.toString());
          const household = JSON.parse(body).properties;
          const household_name = household.household_name;
          const street_address = household.street_address;
          const phone_number = household.phone_number;
          const exist_ns_id = household.netsuite_company_internal_id;


          console.log(exist_ns_id + ' ' + household_name + street_address);
         /*
          const id_exist_options = {
            'method': 'GET',
            'url': `https://4147491-sb1.suitetalk.api.netsuite.com/services/rest/record/v1/customer/${exist_ns_id}`,
            'headers': {
              'Content-Type': 'application/json',
              'Authorization': ns_auth('GET',exist_ns_id)
            }
          };

          request(id_exist_options, function (error, id_exist_response) {
           if (error) throw new Error(error);
            console.log(id_exist_response)
            const exist_customerID = JSON.parse(id_exist_response).id;
            console.log('Netsuite: ' + exist_customerID)

  */
          /************************************************************/
          /*** CREATE HOUSEHOLD AS CUSTOMER IN NESTUITE DEAL RECORD ***/
          /************************************************************/

          var ns_options = {
            'method': 'POST',
            'url': 'https://4147491-sb1.suitetalk.api.netsuite.com/services/rest/record/v1/customer/',
            'headers': {
              'Content-Type': 'application/json',
              'Authorization': AuthorizationHeader
            },
            body: JSON.stringify({
              "companyName": household_name,
              "subsidiary": {
                "id": "1",
                "refName": "Parent Company"
              },
              "isPerson": false,
              "phone":phone_number,
              "custentity_em_company_contact_id_hubspot": household_id,
              "custentity_em_company_id_hubspot": household_id,
              "customForm": {
                "id": "3",
                "refName": "TSS Customer Form"
              },
              "defaultAddress": street_address,
              "entityStatus": {
                "links": [
                  {
                    "rel": "self",
                    "href": "https://4147491-sb1.suitetalk.api.netsuite.com/services/rest/record/v1/customerstatus/13"
                  }
                ],
                "id": "13",
                "refName": "CUSTOMER-ACTIVE"
              }
            })
          };
          request(ns_options, function (error, response) {
            if (error) throw new Error(error);
            //console.log(response)
            //console.log(JSON.parse(response.body).id);
            //console.log(response[0]);
            console.log(response.caseless.dict.location);

            // Extract ID

            const customerId = extractNSrecordId(response.caseless.dict.location);
             console.log('Netsuite Customer ID: '+ customerId)
            if (customerId) {
                console.log(customerId); // Outputs: 682361

                /**************************************************************
                GET CUSTOMER ID AFTER CREATION IN NETSUITE AND
                SAVE IT IN HUBSPOT IN PROPERTY (netsuite_company_internal_id)
                /************************************************************/

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

                let get_ns_cust_id_req = http.request(get_ns_cust_id, function (get_ns_cust_id_res) {
                  var get_ns_cust_id_chunks = [];

                  get_ns_cust_id_res.on("data", function (chunk) {
                    get_ns_cust_id_chunks.push(chunk);
                  });

                  get_ns_cust_id_res.on("end", function () {
                    var get_ns_cust_id_body = Buffer.concat(chunks);
                    console.log(get_ns_cust_id_body.toString());
                  });
                });
                get_ns_cust_id_req.write(JSON.stringify({properties: {netsuite_company_internal_id: customerId}}));
                get_ns_cust_id_req.end();


            } else {
                console.error("Failed to extract customer ID from the provided URL.");
            }




            callback({
              outputFields: {
                ns_customerName: household_name
              }
            });




          });



           /*
          });
*/

        });





      });

      req.end();


    });
  });

  req.end();


}
