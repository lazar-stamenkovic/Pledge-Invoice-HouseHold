/**
Description:
 * 1. Create a household as a customer in Netsuite
 * 2. Callback netsuite customer id
**/
const crypto = require('crypto');
const querystring = require('querystring');
const request = require('request');

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

function ns_auth(method,BaseURL){

   /**********Netsuitet***********/
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

  const household_id = event.inputFields['household_id'];
  const household_name = event.inputFields['household_name'] || '';
  const street_address = event.inputFields['street_address'] || '';
  const phone_number = event.inputFields['phone_number'] || '';


  const baseUrl = 'https://4147491-sb1.suitetalk.api.netsuite.com/services/rest/record/v1/customer/'
  const AuthorizationHeader = ns_auth('POST', baseUrl)
  /******************************/
  /*** END Authentification *****/


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
  try {
    const ns_customer_id = await new Promise((resolve, reject) => {
      request(ns_options, function (error, response) {
        if (error) { return reject(error) };
        if (!response.caseless || !response.caseless.dict || !response.caseless.dict.location) {
          reject(`failed to create customer`)
        }
        const customerId = extractNSrecordId(response.caseless.dict.location);
        resolve(customerId)
      })
    })
    console.log('Netsuite Customer ID: '+ ns_customer_id)
    callback({
      outputFields: {
        ns_customer_id: ns_customer_id
      }
    });
  } catch (e) {
    console.error(e)
    throw e
  }
}
