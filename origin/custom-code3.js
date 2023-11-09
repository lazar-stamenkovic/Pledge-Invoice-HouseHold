const http = require("https");
  const axios = require('axios');

async function getDealAndHousehold(dealId, accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      hostname: "api.hubapi.com",
      port: null,
      path: `/crm/v3/objects/deals/${dealId}?associations=2-14113182&archived=false`,
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const req = http.request(options, (res) => {
      let chunks = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", async () => {
        const body = Buffer.concat(chunks);
        const dealData = JSON.parse(body);
        const householdId = dealData.associations.p21959829_households.results[0].id;


        try {
          const nsId = await getHousehold(householdId, accessToken);
          resolve( [{nsId, householdId}] );
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

function getHousehold(householdId, accessToken) {
  return new Promise((resolve, reject) => {
    const params = `properties=household_name&properties=street_address&properties=phone_number&properties=netsuite_company_internal_id&archived=false`;

    const options = {
      method: "GET",
      hostname: "api.hubapi.com",
      port: null,
      path: `/crm/v3/objects/2-14113182/${householdId}?${params}`,
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const req = http.request(options, (res) => {
      let chunks = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const body = Buffer.concat(chunks);
        const householdData = JSON.parse(body);
        const nsId = householdData.properties.netsuite_company_internal_id;
        resolve(nsId);
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

function httpGet(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        resolve(Buffer.concat(chunks).toString());
      });
    });
    req.on('error', (error) => {
      reject(error);
    });
    req.end();
  });
}

async function getOwnerFullName(ownerId, accessToken) {
  try {
    const response = await axios.get(
      `https://api.hubapi.com/crm/v3/owners/?idProperty=id&archived=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const owners = response.data.results;
    const owner = owners.find(o => o.id === ownerId);
    if (owner) {
      const fullName = owner.firstName + ' ' + owner.lastName;
      return fullName;
    } else {
      console.log('Owner not found');
      return null;
    }

  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}


exports.main = async (event, callback) => {

    /************* Variables ***************/

  const accessToken = process.env.accessToken;
  const dealId = event.inputFields['hs_object_id'];

  /***** END ******** Variables ***************/

  /* Get Owner Name */
  const ownerId = event.inputFields['hubspot_owner_id'];
  const ownerFullName = await getOwnerFullName(ownerId, accessToken);

  const hs_num_of_associated_line_items = event.inputFields['hs_num_of_associated_line_items'];




  console.log(dealId);

  try {
    const data = await getDealAndHousehold(dealId, accessToken);

  console.log(data[0].nsId)

    const ns_id = data[0].nsId;
  	const ns_householdId = data[0].householdId;

    const options = {
      method: 'GET',
      hostname: 'api.hubapi.com',
      port: null,
      path: `/crm/v3/objects/deals/${dealId}/associations/line_items`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    };

    const response = await httpGet(options);
    const lineItems = JSON.parse(response).results;
    let lineItemIds = [];

    for (let lineItem of lineItems) {
      console.log(lineItem.id);
      lineItemIds.push({id: lineItem.id});
    }

    // Here you can use lineItemIds and nsId as needed

    callback({
      outputFields: {
        line_items: lineItemIds,
        ns_id: ns_id,
        householdId: ns_householdId,
        owner_full_name: ownerFullName
      }
    });
  } catch (error) {
    console.error('Error:', error);
    callback({
      error: error.message,
    });
  }
}
