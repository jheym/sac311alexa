const helper = require("./helperFunctions.js")
const axios = require("axios");

/**
* Case objects handle creating new cases to be submitted to
 * the salesforce API. When creating a new case object, generate a new token and
 * supply it to the constructor.
 * @param {String} token
 */
class Salesforce_Case_object {

	constructor(token){
		this.token = token;
		this.sf_url = process.env.SALESFORCE_URL;

		if (this.token === undefined) {
			throw new Error("No token provided for the Salesforce Case Object.");
		}

	};

	/**
	 * Search SFDB contacts by phone number. If contact is found, returns the contact id and name of the contact.
	 * If no contact is found, set the contact name to "anonymous" and id and phone number to null.
	 * @param {String} phone_number
	 * @returns {Object} id, name, phone_number
	 */
	async get_contact(phone_number){
		
		if (phone_number.toString().length > 9) {
			// Is this because they have 3 different formats of phone number in their db?
			phone_number = phone_number.toString().replace(/\D/g, '');
			const phone_number_v1 = phone_number.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
			const phone_number_v2 = phone_number.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
		
			const query = `SELECT ID, Name, Phone FROM Contact WHERE Phone in ('${phone_number_v1}', '${phone_number_v2}', '${phone_number}') LIMIT 1`;
		
			try {
				const response = await axios.get(encodeURI(`${this.sf_url}/query/?q=${query}`), {
				headers: { 
					'Authorization': `Bearer ${this.token}`,
					'Content-Type': 'application/x-www-form-urlencoded',
					'Accept-Encoding': 'application/json'
				}
			});
		
			if (response.data.records.length > 0) {
				this.contact_id = response.data.records[0].Id;
				this.user_name = response.data.records[0].Name;
				this.mobile_number = response.data.records[0].Phone;
				return response.data.records[0].Id;
			} else {
				this.contact_id = null;
				this.user_name = "Anonymous";
				this.mobile_number = null;
				return null;
			}
			} catch (error) {
			console.error(error);
			throw new Error("Failed to retrieve contact from Salesforce.");
			}
		} else {
			this.contact_id = null;
			this.user_name = "Anonymous";
			this.mobile_number = null;
			return null;
		}
	};


	/**
	 * Function to get the service id and parent service id
	 * @param {String} service_name
	 * @returns {Object} service_id, service_type_id 
	 */
	async service_details(service_name){
		const fields = ['Portal_Display_Name__c', 'Name', 'Id', 'Parent_Service_Type__c', 'Interface_Name__c'];
    	const query_fields = fields.join(", ");
		const query = `SELECT ${query_fields} FROM Service_Type__c WHERE Active__c = True AND Name LIKE '%${service_name}%' limit 1`;
		// const query = `SELECT%20Portal_Display_Name__c,%20Name,%20Id,%20Parent_Service_Type__c,%20Interface_Name__c%20FROM%20Service_Type__c%20WHERE%20Active__c%20=%20True%20AND%20Name%20LIKE%20'%25Vehicle%20On%20Street%25'%20limit%201`;

		try {
			const response = await axios.get(encodeURI(`${this.sf_url}/query/?q=${query}`), {
			  headers: {
				'Authorization': `Bearer ${this.token}`,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept-Encoding': 'application/json'
			  }
			});
			if (response.status === 200) {
				this.service_type_id = response.data.records[0].Id;
				this.service_id = response.data.records[0].Parent_Service_Type__c;
				const query2 = `SELECT Name,Id FROM Service_Type__c WHERE Active__c = True AND Id = '${this.service_id}' limit 1`;
				const response2 = await axios.get(encodeURI(`${this.sf_url}/query/?q=${query2}`), {
				  headers: {
					"Authorization": `Bearer ${this.token}`,
					'Content-Type': 'application/x-www-form-urlencoded',
					'Accept-Encoding': 'application/json'
				  }
				});
				
				this.service_name = response2.data.records[0].Name + '->' + response.data.records[0].Name;
				return [this.service_id, this.service_type_id];
			  } else {
				console.log("Error getting service id from Salesforce");
				console.log(response.data);
				throw new Error(response.data);
			  }
		} catch (error) {
			console.error(error);
			throw new Error(error);
		}
	};
};


module.exports = Salesforce_Case_object;

