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

      //console.log('Test ====>' + JSON.parse(body).id)
      //console.log(JSON.parse(body).properties.amount);
      let household_id = JSON.parse(body).associations.p21959829_households.results[0].id;

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
          let exist_ns_id = household.netsuite_company_internal_id;
          //const phone_number = household_id;

          //console.log(household_name + street_address);


    // Check if the net_id property is empty and assign a default value if needed
    if (!exist_ns_id || exist_ns_id.trim() === '') {
        exist_ns_id = '000';
    }


  /******************************/
  /****** Authentification ******/
  /******************************/

  const BaseURL = `https://4147491-sb1.suitetalk.api.netsuite.com/services/rest/record/v1/customer/${exist_ns_id}`;
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
  const SignatureMessage = `GET&${BaseURLEncoded}&${ConcatenatedParametersEncoded}`;

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



        const id_exist_options = {
            'method': 'GET',
            'url': `https://4147491-sb1.suitetalk.api.netsuite.com/services/rest/record/v1/customer/${exist_ns_id}`,
            'headers': {
              'Content-Type': 'application/json',
              'Authorization': AuthorizationHeader
            }
          };

          request(id_exist_options, function (error, id_exist_response) {
            if (error) throw new Error(error);
            console.log( JSON.stringify(JSON.parse(id_exist_response.body).id, null, 2) )
            const exist_customerID = JSON.parse(id_exist_response.body).id;
          	//console.log(id_exist_response)

            if (exist_customerID) {
              console.log(`Customer with ID ${exist_customerID} exists.`);

              callback({
                outputFields: {
                  customer_exist: 'yes'
                }
              });
//682362
            } else {
              console.log(`Customer does not exist.`);
              let parsedResponse = JSON.parse(id_exist_response.body);
			  const errorCode = parsedResponse['o:errorDetails'][0]['o:errorCode'];


              callback({
                outputFields: {
                  customer_exist: errorCode
                }
              });

            }

          });



        });
      });

      req.end();




    });
  });

  req.end();





}
