const helper = require("./helperFunctions.js")
const axios = require("axios");


class Salesforce_Case_object {	
/**
 * Case objects handle creating new cases to be submitted to
 * the salesforce API. When creating a new case object, generate a new token and
 * supply it to the constructor.
 * @param {Object} handlerInput - the handlerInput object from the Alexa request
 * @param {String} token - the OAuth access token for the Salesforce API
 * @param {String} service_name - the 311 service name. Each intent should submit the case object with the correct service name.
 */
	constructor(handlerInput=null, service_name=null, token) {
		if (handlerInput !== null)
			this.handlerInput = handlerInput;
		if (service_name !== null)
			this.service_name = service_name;
		this.token = token;
		this.sf_url = process.env.SALESFORCE_URL;
		this.json_input = {};
		this.mapped = gis_to_sf_mapping;

		// Generate the json_input object from handlerInput
		if (handlerInput && service_name)
			this._make_json_input(handlerInput);

		if (this.token === undefined)
			throw new Error("No token provided for the Salesforce Case Object.");
	};



	/**
	* Sets a json_object attribute for the case object. Mimics the format of
 	* json_input submitted by IVR but uses Alexa slot key value pairs instead.
 	* @param {Object} handlerInput 
	* @returns {void}
 	*/
	 _make_json_input(handlerInput) {
		if (!handlerInput.requestEnvelope.request.intent.slots) {
			throw new Error("No slots found in the handlerInput.");
		} else {
			const { requestEnvelope, attributesManager} = handlerInput;
			const sessionAttributes = attributesManager.getSessionAttributes();
			const slots = requestEnvelope.request.intent.slots;

			// Getting json_input values from session attributes
			this.json_input.phone_number = sessionAttributes.phone_number; // TODO: Should phone number be in json_input?
			this.json_input.address = sessionAttributes.confirmedValidatorRes.Address; 
			
			for (const slot of Object.entries(slots)) {
				let slot_name = slot[1].name;
				let slot_value = slot[1].value;
				if (mappings.hasOwnProperty(slot_name)) {
					this.json_input[slot_name] = slot_value;
				}
			}

		}	
	}

	
	async create_basic_case(service_name, phone_number, Address, user_json=null, update_case=true) { //TODO: Why is address param never used?
		if (user_json === null)
			user_json = this.json_input; // json_input is created in constructor
		await this.get_service_details(service_name);
		await this.get_contact(phone_number); // if phone number is null, sets the contact to anonymous
		this.update_case = update_case; // Set to true to indicate the case needs updating still.
		this.input_service_name = service_name;
		this.case_ans = this.service_question_mapper(user_json);
	
		const case_body = {
			"Sub_Service_Type__c": this.service_type_id,
			"Subject": `${this.service_name}-${this.user_name}`,
			"Status": "NEW", 
			"Service_Type__c": this.service_id,
			"Origin": "AmazonAlexa",
			"contactId": this.contact_id, // TODO: Can this be null?
			"Description": `Initial Case description : \n ${this.case_ans['Description']}`,
			"Email_Web_Notes__c": this.case_ans['Description'],
		};
		
		// Submitting the ticket here
		try {
			const case_resp = await axios({
				url: `${this.sf_url}/sobjects/Case`,
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.token}`,
					'Content-Type': 'application/json',
					'Accept-Encoding': 'application/json'
				},
				data: case_body
			});
	
			if (![200, 201, 204].includes(case_resp.status)) {
				console.error("Error creating basic case");
				console.info(case_resp.json());
			}
	
			this.case_id = case_resp.data.id;
			await this.get_case_number(); // Get the case number from the case id
			return { 'case_number' : this.case_number, 'case_id' : this.case_id };
		} catch (error) {
			console.error("Error creating basic case");
			console.log(error);
			throw error;
		}
	};
	/**
	 * Finalizes a case draft. This function should be called after
	 * create_basic_case() and optionally can include additional user_json
	 * details.
	 * @param {string} case_id 
	 * @param {string} Address 
	 * @param {string} service_name 
	 * @param {object} user_json 
	 * @param {bool} update_case 
	 * @param {int} threshold 
	 * @returns {object} case number, http status code of the PATCH request
	 */
	async case_update(case_id, Address, service_name, user_json=null, update_case=true, threshold=90) {
		this.input_address=Address;
		this.update_case = update_case;
		let phone_number = null;
		let case_body = {};
		
		// How else do you give the phone number?
		if (user_json && user_json.phone_number)
			phone_number = user_json.phone_number.match(/\d+/g).join("");
		
		await this.get_contact(phone_number) // Need contact for setting Anonymous_Contact__c field
		
		// TODO: Figure out how to get the phone number from json_input

		this.case_ans = this.service_question_mapper(this.json_input); // Modified to use json_input (which is created by _make_json_input())
		if (service_name) {
			this.input_service_name = service_name;
			await this.get_service_details(service_name);
		}
		
		if (case_id) { this.case_id = case_id; }
		const { internal_geocoder } = await this.world_address_verification(Address, threshold)
		this.addr_resp = internal_geocoder;
		await this.get_gis_attribute();
		if (this.addr_resp.length === 0) { 
			console.error("Error: No address found for case_update");	
			return false; 
		}
		if (user_json) { this.case_ans = this.service_question_mapper(user_json, false); } // 
		case_body.Status = 'NEW';
		case_body.Sub_Service_Type__c = this.service_type_id;
		case_body.Subject = `${this.service_name}-${this.user_name}`; //TODO: user_name is undefined
		case_body.Service_Type__c = this.service_id;
		case_body.Anonymous_Contact__c = this.contact_id ? "false" : "true";
		if (this.contact_id) { case_body.contactId = this.contact_id; }
		case_body.Email_Web_Notes__c = this.case_ans.Description;
		case_body.Description = `Additional case details \n ${this.case_ans.Description}`;
		case_body.Address_Geolocation__Latitude__s = this.addr_resp.candidates[0].location.y;
		case_body.Address_Geolocation__Longitude__s = this.addr_resp.candidates[0].location.x;
		case_body.Address_X__c = this.addr_resp.candidates[0].attributes.X;
		case_body.Address_Y__c = this.addr_resp.candidates[0].attributes.Y;
		case_body.Address__c = this.addr_resp.candidates[0].address;
		case_body.GIS_City__c = this.addr_resp.candidates[0].attributes.City;
		case_body.Street_Center_Line__c = this.addr_resp.candidates[0].attributes.Loc_name;
		case_body.Case_Gis_Info_JSON__c = this.gis_json;
		this.b = new Date(Date.now()).toISOString(); // TODO: Does this date get submitted to the database? Where?
		await this.create_case_questions();

		try {
			this.case_resp = await axios({
				url: `${this.sf_url}/sobjects/Case/${this.case_id}`,
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${this.token}`,
					'Content-Type': 'application/json',
					'Accept-Encoding': 'application/json'
				},
				data: case_body
			})

			if (![200, 201, 204].includes(this.case_resp.status)) {
				console.log('Error updating case questions');
				console.log(this.case_resp.data);
			}
		} catch(error) {
			console.error("Error updating case");
			console.log(error);
		}
		await this.get_case_number();
		return {'case_number' : this.case_number, 'status_code' : this.case_resp.status}
	};


	// TODO: Write create_generic_case and update_generic_case
	async create_generic_case(service_name, phone_number, user_json) {
		this.get_service_details(service_name="IVR");
	}



	/**
	 * Search SFDB contacts by phone number. If contact is found, returns the contact id and name of the contact.
	 * If no contact is found, set the contact name to "anonymous" and id and phone number to null.
	 * @param {String} phone_number
	 * @returns {Object} id, name, phone_number
	 */
	async get_contact(phone_number){
		
		if (phone_number && phone_number.toString().length > 9) {
			phone_number = phone_number.toString().replace(/\D/g, '');
			const phone_number_v1 = phone_number.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
			const phone_number_v2 = phone_number.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
		
			const query = `SELECT ID, Name, Phone FROM Contact WHERE Phone in ('${phone_number_v1}', '${phone_number_v2}', '${phone_number}') LIMIT 1`;
		
			try {
				const response = await helper.querySFDB(query, this.token);
		
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
	 * Sets this.service_id and this.service_type_id
	 * @param {string} service_name - name of the service to search for
	 * @returns {void}
	 * pairs and "description" string at the end of the array
	 */
	async get_service_details(service_name){
		const fields = ['Portal_Display_Name__c', 'Name', 'Id', 'Parent_Service_Type__c', 'Interface_Name__c'];
    	const query_fields = fields.join(", ");
		const query = `SELECT ${query_fields} FROM Service_Type__c WHERE Active__c = True AND Name LIKE '%${service_name}%' limit 1`;

		try {
			const response = await helper.querySFDB(query, this.token);
			if (response.status === 200) {
				this.service_type_id = response.data.records[0].Id;
				this.service_id = response.data.records[0].Parent_Service_Type__c;
				
				// Get the parent service name and append the sub service name to it
				const query2 = `SELECT Name,Id FROM Service_Type__c WHERE Active__c = True AND Id = '${this.service_id}' limit 1`;
				const response2 = await helper.querySFDB(query2, this.token);
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

	/**
	 * Creates the case_ans object that contains the question-answer pairs for
	 * the case along with the "description" field
	 * @param {object} input_json - optional
	 * @param {bool} service_question_in_description - Whether or not to include
	 * the service questions in the description element
	 * @returns {array} case_ans - array of objects containing question-answer
	 * pairs and "description" string at the end of the array
	 */
	service_question_mapper(input_json=this.input_json, service_question_in_description=true){
		let desc_exclude_list=["phone_number","service_type","case_id","destination_type","destination_value"];
		let desc_include_list=["animal_type","animal_location","relamp_problem_description"];

		let case_ans={"Description":[]};

		for (let [k, v] of Object.entries(input_json)) {
			if (mappings.hasOwnProperty(k)) {
				case_ans[mappings[k]] = v;
				if (service_question_in_description || desc_include_list.includes(k)) {
					case_ans["Description"].push(k + " - " + v);
				}
			}
			else {
				if (!desc_exclude_list.includes(k)) {
					case_ans["Description"].push(k + " - " + v); // Description does not contain values from the exclude list
				}
			}
		}

		case_ans["Description"] = case_ans["Description"].join(",\n ");
		return case_ans;
	}


	async get_case_number(case_id=null) {
		if (case_id === null)
			case_id = this.case_id

		const query = `SELECT Id,CaseNumber FROM Case WHERE Id = '${case_id}' limit 1`
		const res = await helper.querySFDB(query, this.token);
		this.case_number = res.data.records[0].CaseNumber;
	}
	


	async address_case_validator(address, subject = null, threshold = 80, check_period = 3, check_case = true) {
		const subject_map = service_type_to_sf_service;
		const addr_validation_out = {};
		const geocoded_out = await this.world_address_verification(address, threshold);
		
		if (geocoded_out.internal_geocoder.candidates) {
			const addr = geocoded_out.internal_geocoder.candidates[0].address.replace(' & ', ' and ');
			console.log(addr);
			addr_validation_out.Address = addr.split(',')[0];
			const X = geocoded_out.internal_geocoder.candidates[0].attributes.X;
			const Y = geocoded_out.internal_geocoder.candidates[0].attributes.Y;
			const district_overlay = await axios.get(`https://services6.arcgis.com/YBp5dUuxCMd8W1EI/arcgis/rest/services/City_County/FeatureServer/0/query?outFields="DISTRICT"&geometryType=esriGeometryPoint&geometry=${X},${Y}&spatialRel=esriSpatialRelIntersects&f=json&inSR=2226&returnGeometry=false`)
			const district = district_overlay.data.features[0].attributes.DISTRICT;
			addr_validation_out.District = district;
			addr_validation_out.Full_Address = addr;
			addr_validation_out.Validated = "CoS";
			addr_validation_out.Score = geocoded_out.internal_geocoder.candidates[0].score;
			addr_validation_out.geocoderResponse = geocoded_out; // Modified to include the full address object
			const from_date = new Date(Date.now() - check_period * 24 * 60 * 60 * 1000);
			const created_date = from_date.toISOString();
			
			if (check_case) {
				if (subject && typeof subject === "string") {
					subject = subject_map[subject.toLowerCase()];
				} else {
					subject = Object.values(subject_map).join("%' OR Subject LIKE '%");
				}
				const query = `SELECT CaseNumber,Description,Subject,CreatedDate FROM Case WHERE Portal_Status__c != 'Closed' AND CreatedDate >= ${created_date} AND Address__c = '${addr}' AND (Subject LIKE '%${subject}%' ) ORDER BY CreatedDate DESC NULLS LAST`;
				const response = await helper.querySFDB(query, this.token)
				
				// const query_string = encodeURIComponent(query);
				// const response = await fetch(`${sf_url}/query/?q=${query_string}`, {
				// 	headers: { "Authorization": `Bearer ${this.token}` }
				// });
				if (response.data.records.length) {
					const similarCases = {};
					response.data.records.forEach(record => {
					  similarCases[record.CaseNumber] = record.Subject;
					});
					addr_validation_out.Similar_Cases = similarCases;
				}
				} else {
					addr_validation_out.Similar_Cases = null;
				}
			console.log("inside internal");
			} else if (geocoded_out.world_geocoder.candidates && geocoded_out.world_geocoder.candidates.length > 0) {
				const addr = geocoded_out.world_geocoder.candidates[0].address.replace(' & ', ' and ');
				addr_validation_out.Full_Address = addr;
				addr_validation_out.Address = addr.split(',').slice(0, -2).join(',');
				const X = geocoded_out.world_geocoder.candidates[0].attributes.X;
				const Y = geocoded_out.world_geocoder.candidates[0].attributes.Y;
				const district_overlay = await axios.get(`https://services6.arcgis.com/YBp5dUuxCMd8W1EI/arcgis/rest/services/City_County/FeatureServer/0/query?outFields="DISTRICT"&geometryType=esriGeometryPoint&geometry=${X},${Y}&spatialRel=esriSpatialRelIntersects&f=json&inSR=4326&returnGeometry=false`)
				const district = district_overlay.data.features[0].attributes.DISTRICT;
				addr_validation_out.District = district;
				addr_validation_out.Score = geocoded_out.world_geocoder.candidates[0].score;
				addr_validation_out.Validated = "world";
				addr_validation_out.geocoderResponse = geocoded_out; // Modified to include the full address object
			} else {
				addr_validation_out.Address = address;
				addr_validation_out.Full_Address = null;
				addr_validation_out.District = null;
				addr_validation_out.Validated = null;
			}

			if (addr_validation_out['District'] == 'CITY OF SACRAMENTO') {
				addr_validation_out['Within_City'] = true;
			} else {
				addr_validation_out['Within_City'] = false;
			}

			return addr_validation_out;
	}

	async world_address_verification(Address="915 I Street", threshold=80) {
		let output = {};
		// console.log(Address.length)
		if (Address.length > 0) {
			let addr = Address.replace(" USA",'');
			let response = await helper.getWorldAddress(addr)
			let resp_dict = await this.internal_verifier(response.data, threshold);
			let internal_response=[];
			let overview=[];
			if (typeof(threshold) != "number") {
				threshold = parseInt(threshold);
			}
			if (response.status == 200 && typeof(resp_dict) == 'object' && 'candidates' in resp_dict && resp_dict['candidates'].length > 0 && resp_dict['candidates'][0]['score'] >= threshold) {
				let address = resp_dict['candidates'][0]['attributes']['ShortLabel'];
				let city = resp_dict['candidates'][0]['attributes']['City'];
				let county = resp_dict['candidates'][0]['attributes']['Subregion'];
				
				let city_response = await helper.getInternalAddress(resp_dict.candidates[0]);
				if (city_response.status == 200 && city_response.data['candidates'].length > 0) {
					internal_response = await this.internal_verifier(city_response.data, threshold);
				}
				overview = {"address":address,"city":city,"county":county};
			} else {
				let url_address = encodeURIComponent(addr);
				let city_geocoder_url = `https://sacgis311.cityofsacramento.org/arcgis/rest/services/ADDRESS_AND_STREETS/GeocodeServer/findAddressCandidates?SingleLine=${url_address}&category=&outFields=*&outSR=4326&searchExtent=&location=&distance=&magicKey=&f=pjson`;
				let city_response = await axios.get(city_geocoder_url)
				if (city_response.status == 200 && city_response.data['candidates'].length > 0) {
					internal_response = internal_verifier(city_response.data, threshold);
				}
			}
			output = {"world_geocoder":resp_dict,"internal_geocoder":internal_response,"overview":overview};
		}
		return output;
	}

	/**
	 * Function to get the best address match from the given json response from geocoder response
	 *
	 * @param {object} json_input - Response json from geocoder
	 * @param {int} threshold - Threshold for limit on score
	 *
	 * @returns {object} out - Contains best matched address else returns empty object
	 */
	async internal_verifier(json_input, threshold = 85) {
	  
		let out = { spatialReference: json_input.spatialReference };
		let score = threshold;
	  
		if (!('candidates' in json_input) || json_input.candidates.length === 0) {
		  return [];
		}
	  
		for (let i of json_input.candidates) {
		  if (i.score >= score) {
			score = i.score;
			out.candidates = [i];
	  
			if (score === 100) {
			  break;
			}
		  }
		}
	  
		if (!('candidates' in out)) {
		  return [];
		}
	  
		return out; // out contains a spatial reference and a list of candidates
	  }



	async get_gis_attribute() {
		
		var addr_resp = this.addr_resp; // Set by world_address_verification
		var street_id;
		
		if (addr_resp.length === 0)
			return "Failed Case update"
		if (this.case_id.length === 0)
			this.case_id = null;

		var addr_id = addr_resp.candidates[0].attributes.User_fld
		var { out_json, dtpr } = await this.overlay(addr_resp);
		
		if (addr_resp.candidates[0].attributes.Addr_type === 'Address') {
			let addr_detail = await this.get_address_APN_CITUS(addr_id, dtpr);
			out_json.data.layers.push(addr_detail);
			let street_resp = await this.get_street_id(addr_id);
			out_json.data.layers.push(street_resp);
			street_id = street_resp.features[0].attributes.NETSEGMENTID;
		} else if (addr_resp.candidates[0].attributes.Addr_type === 'StreetInt') {
			street_id = addr_resp.candidates[0].attributes.User_fld1;
		} else {
			street_id = addr_resp.candidates[0].attributes.User_fld;
		}
		var cross_detail = await this.get_cross_street(String(street_id));
		out_json.data.layers.push(cross_detail);

		if (addr_resp.candidates[0].attributes.Addr_type != 'Address') {
			let layer_1 = 	{	
							'id': 1,
							'objectIdFieldName': 'OBJECTID',
							'globalIdFieldName': 'GLOBALID',
							'fields': [{'name': 'STREET ID',
							'alias': 'STREET ID',
							'type': 'esriFieldTypeString'}],
							'features': [{'attributes': {'STREET ID': street_id }}]
							}
			out_json.data.layers.push(layer_1);
		}

		var temp = [];
		
		for (const layer of out_json.data.layers) {
			if (layer.hasOwnProperty('fields') && this.mapped.hasOwnProperty(layer.id)) {
				for (const field of layer.fields) {
					if (this.mapped[layer.id].hasOwnProperty(field.name)) {
						let out = { 'Id' : null };
						out.attributes = { 'type' : 'Case_GIS_Info__c'};
						out.Layer_Id__c = String(layer.id);
						out.Case__c = this.case_id;
						out.Field_Name_in_Service__c = field.name;

						if (field.name === 'DTPR_FLAG') {
							out.Value__c = layer.features[0].attributes.hasOwnProperty(field.name) ? "Yes" : "No"; // TODO: Is this correct?
						} else {
							out.Value__c = layer.features[0].attributes[field.name]; // TODO: Is this working right?
							// console.log(out.Value__c);
						}
						if (field.name === 'GARBAGE_DAY') { // TODO: Why did this execute when name wasn't garbage day
							let out2 = JSON.parse(JSON.stringify(out)); // Deep copy
							out.Label__c = this.mapped[layer.id][field.name][0];
							out2.Label__c = this.mapped[layer.id][field.name][1];
							temp.push(out2);
						} else {
							out.Label__c = this.mapped[layer.id][field.name];
						}
						temp.push(out);
					}}}
		} // layer loop

		this.gis_json = JSON.stringify(temp); // TODO: Compare this format to already created cases
			
	} // get_gis_attribute
		



	async overlay(address_json) {

		var overlay_url;
		
		if (typeof(address_json) === 'string') { // Will this ever be a string for us?
			var out_json = this.world_address_verification(address_json);
			if (!typeof(out_json.internal_geocoder) === 'object') {
				var resp_json = out_json.internal_geocoder;
			} else {
				resp_json = out_json.world_geocoder; // TODO: Is world geocoder response not an object?
			}
		} else {
			resp_json = address_json;
		}

		if (typeof(resp_json) === 'object') {
			var x = resp_json.candidates[0].location.x;
			var y = resp_json.candidates[0].location.y;
			// console.log(x, y);
			var dtpr_flag = await this.check_dtpr(x, y);
			if (dtpr_flag)
				overlay_url = `https://sacgis311.cityofsacramento.org/arcgis/rest/services/GenericOverlay/FeatureServer/query?layerDefs=[{"layerId":0,"outFields":"DTPR_FLAG,+RECYCLE_WEEK,+OP_AREA"},{"layerId":2,"outFields":"DISTRICT"},{"layerId":3,"outFields":"ZIP5"},{"layerId":4,"outFields":"NAME"},{"layerId":5,"outFields":"CITY_NAME"},{"layerId":6,"outFields":"BEAT"},{"layerId":7,"outFields":"DISTRICT"},{"layerId":8,"outFields":"DISTNUM"},{"layerId":9,"outFields":"DISTRICT"},{"layerId":10,"outFields":"PAGE,TB_ROW,TB_COL"},{"layerId":11,"outFields":"OFFICER"},{"layerId":12,"outFields":"OFFICER"},{"layerId":13,"outFields":"RAINA"},{"layerId":14,"outFields":"RAINB"},{"layerId":15,"outFields":"NAME"},{"layerId":16,"outFields":"TILENUM"},{"layerId":17,"outFields":"DISTRICT"},{"layerId":18,"outFields":"NAME"},{"layerId":19,"outFields":"BEAT_NUM"},{"layerId":25,"outFields":"MAINTSUP"},{"layerId":34,"outFields":"ZI_OFFICER"},{"layerId":35,"outFields":"VA_OFFICER"},{"layerId":36,"outFields":"H_OFFICER"},{"layerId":38,"outFields":"SW_OFFICER"},{"layerId":39,"outFields":"NSA"}]&geometry={"x":' + ${x} + ',"y":' + ${y} + '}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&returnDistinctValues=false&returnGeometry=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnTrueCurves=false&sqlFormat=none&f=json`
			else
				overlay_url = `https://sacgis311.cityofsacramento.org/arcgis/rest/services/GenericOverlay/FeatureServer/query?layerDefs=[{"layerId":0,"outFields":"DTPR_FLAG,+SERVICE_DAY+,+RECYCLE_WEEK,+ROUTE,+OP_AREA"},{"layerId":2,"outFields":"DISTRICT"},{"layerId":3,"outFields":"ZIP5"},{"layerId":4,"outFields":"NAME"},{"layerId":5,"outFields":"CITY_NAME"},{"layerId":6,"outFields":"BEAT"},{"layerId":7,"outFields":"DISTRICT"},{"layerId":8,"outFields":"DISTNUM"},{"layerId":9,"outFields":"DISTRICT"},{"layerId":10,"outFields":"PAGE,TB_ROW,TB_COL"},{"layerId":11,"outFields":"OFFICER"},{"layerId":12,"outFields":"OFFICER"},{"layerId":13,"outFields":"RAINA"},{"layerId":14,"outFields":"RAINB"},{"layerId":15,"outFields":"NAME"},{"layerId":16,"outFields":"TILENUM"},{"layerId":17,"outFields":"DISTRICT"},{"layerId":18,"outFields":"NAME"},{"layerId":19,"outFields":"BEAT_NUM"},{"layerId":25,"outFields":"MAINTSUP"},{"layerId":28,"outFields":"ROUTE"},{"layerId":29,"outFields":"ROUTE"},+{"layerId":34,"outFields":"ZI_OFFICER"},{"layerId":35,"outFields":"VA_OFFICER"},{"layerId":36,"outFields":"H_OFFICER"},{"layerId":38,"outFields":"SW_OFFICER"},{"layerId":39,"outFields":"NSA"}]&geometry={"x":' + ${x} + ',"y":' + ${y} + '}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&returnDistinctValues=false&returnGeometry=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnTrueCurves=false&sqlFormat=none&f=json`
			
			const res = await axios.get(encodeURI(overlay_url));

			return { 'out_json' : res, 'dtpr' : dtpr_flag };
		}
	}



	async check_dtpr(x, y) {
		var dtpr_flag = false;
		var url = `https://sacgis311.cityofsacramento.org/arcgis/rest/services/GenericOverlay/FeatureServer/query?layerDefs=[{"layerId":0,"outFields":"DTPR_FLAG"}]&geometry={"x":' + ${x} + ',"y":' + ${y} + '}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&returnDistinctValues=false&returnGeometry=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnTrueCurves=false&sqlFormat=none&f=json`
		// console.log(url);
		
		const res = await axios.get(encodeURI(url))
		var layers = res.data.layers;
		
		for (var layer in layers) {
			if (layers[layer].id === 0 && layers[layer].features.length > 0) {
				if (layers[layer].features[0].attributes.hasOwnProperty('DTPR_FLAG') && layers[layer].features[0].attributes.DTPR_FLAG === 'X')
					dtpr_flag = true;
			}
		}
		
		return dtpr_flag;
	}



	async get_address_APN_CITUS(address_id, dtpr=false) {
		const layer_id = 37;
		var fields_to_capture = [	'APN','SITUSADDRESS','ADDRESSID',
									'NAME', 'MAIL_ADDRE', 'MAIL_CITY','ISPRIMARY',
									'MAIL_STATE', 'MAIL_ZIP','SITUSADDRESS']
		
		if (dtpr) {
			fields_to_capture = fields_to_capture.concat(['GARBAGE_DAY','RECYCLE_DAY','RECYCLE_ROUTE','GARBAGE_ROUTE','LAWN_DAY','LAWN_ROUTE'])
		}
		let fields = fields_to_capture.join(',');
		let addr_url=`https://sacgis311.cityofsacramento.org/arcgis/rest/services/GenericOverlay/FeatureServer/37/query?where=ADDRESSID=${address_id}&outFields=${fields}&f=pjson`
		console.log(encodeURI(addr_url));
		const res = await axios.get(encodeURI(addr_url));

		const day_mapping = {'SUN': 'Sunday', 'MON': 'Monday', 'TUE': 'Tuesday', 'WED': 'Wednesday', 'THU': 'Thursday', 'FRI': 'Friday', 'SAT': 'Saturday'};

		let resp_json = res.data;
		resp_json.id = layer_id;

		for (let [field, value] of Object.entries(resp_json.features[0].attributes)) {
			if (field === 'GARBAGE_DAY' && value && value.slice(0, 3).toUpperCase() in day_mapping) {
				value = day_mapping[value.slice(0,3)];
			}	
			resp_json.features[0].attributes[field] = value;
		}
		  
		  return resp_json;

	}


	async get_street_id(address_id) {
		const layer_id = 22;
		const gis_url = `https://sacgis311.cityofsacramento.org/arcgis/rest/services/GenericOverlay/FeatureServer/${layer_id}/query?where=ADDRESSID = ${address_id}&outFields=*&returnGeometry=true&f=pjson`
		let res = await axios.get(encodeURI(gis_url));
		res.data.id = layer_id;
		return res.data
	}

	async get_cross_street(street_id) {
		const layer_id = 23;
		const fields_to_capture = ['C1STRNAME','C2STRNAME','PRIVATE'];
		const fields = fields_to_capture.join(', ');
		const gis_url = `https://sacgis311.cityofsacramento.org/arcgis/rest/services/GenericOverlay/FeatureServer/${layer_id}/query?where=UNIQUE_ID = ${street_id}&outFields=${fields}&f=pjson`;
		let res = await axios.get(encodeURI(gis_url));
		res.data.id = layer_id;
		return res.data;
	}

	/**
	 * POSTs question/answer details to the Case_Question__c table.
	 */
	async create_case_questions() {
		
		const questions = await this.service_questions();
		const case_response = this.case_ans;
		
		const case_question_sequence = {	
			"vehicle on":[
				"Vehicle Color","Vehicle Make",
				"Vehicle Model","Licence Plate Number",
				"# of Days Abandoned","ACTIVITY","ASSIGN TO",
				"CASE STATUS","CITIZENSERVE CATEGORY",
				"DEPARTMENT","FILE TYPE","PRIORITY",
				"CITIZENSERVE USER"],
			"relamp":[
				"Work Order Description","Please select an Asset",
				"Infor Priority","Requestor","Ready for Dispatch?",
				"INFOR JOB TYPE","INFOR CLASS","INFOR STATUS",
				"INFOR STANDARD WO","Asset Id"],
			"dead":[
				"Please select where the animal is located",
				"Type of Animal","Animal Total","Ready for Dispatch?",
				"CHAMELEON ACTIVITY TYPE","CHAMELEN ACTIVITY SUB TYPE",
				"CHAMELEON PRIORITY"],
			"concern": [
				"Is the camp on private or public property?",
				"How many people at the camp",
				"Are there any children ?",
				"Are there any animals?"],
			"homeless camp- trash": [],
			"homeless encampment blocking sidewalk": [  
				"Is this camp on a sidewalk?",
				"Is there criminal activity taking place?",
				"How many people at the camp?",
				"Are there any children?",
				"Are there any animals?"],
			"building department": ["Building Inspection Details"],
			"planning": ["Planning Counter Details"]
		}

		var caseq = [];
	  
		for (const question of questions) {
		  let answer = null;
		  if (question.Question_Type__c !== 'Picklist') {
			answer = case_response[question.Question_Label__c];
		  } else {
			if (question.Question_Label__c in case_response) {
			  const ans_options = question.ans_options;
			  const ans_options_lower = ans_options.map((ans) => ans.toLowerCase());
			  const case_response_split_lower = case_response[question.Question_Label__c].split(' ').map((ans) => ans.toLowerCase());
			  const answer_set = new Set(case_response_split_lower.filter((ans) => ans_options_lower.includes(ans)));
	  
			  if (answer_set.size === 0) {
				answer = ans_options_lower.includes('other') ? 'Other' : question.ans_default;
			  } else {
				answer = Array.from(answer_set)[0];
			  }
			} else {
			  answer = question.ans_default;
			}
		  }
	  
		  if (question.Question_Label__c === 'Ready for Dispatch?') {
			answer = 'No';
		  }
	  
		  const temp_obj = {
			Case__c: this.case_id,
			Question__c: question.Question_Label__c,
			Integration_Type__c: question.Integration_Type__c,
			Integration_Tag__c: question.Integration_Tag__c,
			Ready_For_Dispatch__c: question.Ready_For_Dispatch__c,
			Is_CCB_Question__c: question.Is_CCB_Question__c,
			Portal_Question_Label__c: question.Portal_Question_Label__c,
			Answer__c: answer,
		  };
		  caseq.push(temp_obj);
		}
		let res;
		if (res = await this.case_question_new()){
			caseq = caseq.concat(res);
		}
	  
		const new_seq = [];
		var qsequence_key;
		
		// if a key in case_question sequence is a substring of the
		// input_service_name, set that question sequence to qsequence_key
		for (let key of Object.getOwnPropertyNames(case_question_sequence)) {
			if (this.input_service_name.toLowerCase().includes(key)) {
				qsequence_key = key;
				break;
			}
		}
		
		
		for (let question_label of case_question_sequence[qsequence_key]) {
			for (let i of caseq) {
				if (question_label === i.Question__c) {
					new_seq.push(i);
					break;
				}
			}
		}
		
		caseq = new_seq; // TODO: Confirm new_seq has expected output
		this.caseq = caseq;
		
		if (this.update_case) {
		  	const resp = [];
		  	for (let json_out of caseq) {
				delete json_out.Integration_Type__c; // TODO: Delete these lines. They are temporary until permissions are fixed
				delete json_out.Portal_Question_Label__c;
				try {
					var case_resp = await axios({
						url: `${this.sf_url}/sobjects/Case_Questions__c`,
						method: 'POST',
						headers: { 
							'Authorization': `Bearer ${this.token}`,
							'Content-Type': 'application/json',
							'Accept-Encoding': 'application/json'
						},
						data: json_out
					});

					if (![200, 201, 204, 203].includes(case_resp.status)) {
						console.log('Error updating case questions');
						console.log(case_resp.data);
					}
				} catch(error) {
					console.error("Error creating basic case");
					console.log(error);
					throw error;
				}
				resp.push(case_resp.data);
			} // Done posting data
			this.case_question_details = resp;
		}

	}


	async service_questions() {
		const query = `SELECT Id,Integration_Type__c,Integration_Tag__c,Is_CCB_Question__c,Portal_Question_Label__c,Question_Label__c,Question_Type__c,Ready_For_Dispatch__c FROM Service_Type_Question__c WHERE Active__c = True AND Service_Type__c = '${this.service_type_id}' limit 100`;
		
		const response = await helper.querySFDB(query, this.token);

		const service_questions_rep = response.data;
		const service_questions = service_questions_rep.records;
		const service_questions_updated = [];
		for (let question of service_questions) {
			if (question.Question_Type__c === 'Picklist') {
				const ans_op = await this.get_question_value(question.Id);

				// i['ans_options'] = ans_op[i['Id']].map(op => op['Lookup_Value__c']);
				question.ans_options = ans_op[question.Id].map(op => op.Lookup_Value__c);
				console.log(question.ans_options);
				// more code
			}
			
			service_questions_updated.push(question);
		}
		this.service_type_questions = service_questions_updated;
		return service_questions_updated;
	}

	async get_question_value(service_question_id) {
		const field_req = ["Is_Default__c","Lookup_Values__c","Lookup_Value__c","Service_Type_Question__c"];
		const fields = field_req.join(',');
		const query = `SELECT ${fields} FROM Service_Type_Que_To_Lookup_Values_JN__c WHERE IsDeleted = false AND Service_Type_Question__c = '${service_question_id}'`
		const response = await helper.querySFDB(query, this.token);
		const answers_resp = response.data;
		const req_keys = ['Is_Default__c',  'Lookup_Value__c'];
		const out = {};
		for (let record of answers_resp.records) {
			if (!(record.Service_Type_Question__c in out))
				out[record.Service_Type_Question__c] = [];
			let recordObj = {};
			for (let k of req_keys)
				recordObj[k] = record[k];
			out[record.Service_Type_Question__c].push(recordObj);
		}
		return out;
	}


	case_question_new(service_type=null) {
		if (this.input_service_name) 
			service_type = this.input_service_name; // where does input_service_name get set?
		
	  
		const Vehicle_On_Street=[ {"Case__c" : this.case_id,
			"Question__c": "ACTIVITY",
			"Answer__c" :"Initial Inspection",
			"Integration_Type__c" :"CSERVE"}, // LOB CODE

			{"Case__c" :this.case_id,
			"Question__c" :"ASSIGN TO",
			"Answer__c" :"GIS Layer Vehicle Abatement Officer",
			"Integration_Type__c" :"CSERVE"},

			{ "Case__c" :this.case_id,
			"Question__c" :"CASE STATUS",
			"Answer__c" :"New",
			"Integration_Type__c" :"CSERVE"
			},

			{  "Case__c" :this.case_id,
			"Question__c" :"CITIZENSERVE CATEGORY",
			"Answer__c" :"Vehicle On Street",
			"Integration_Type__c" :"CSERVE",
			},

			{"Case__c" :this.case_id,
			"Question__c" :"DEPARTMENT",
			"Answer__c" :"Code",
			"Integration_Type__c" :"CSERVE"
			},

			{ "Case__c" :this.case_id,
			"Question__c" :"FILE TYPE",
			"Answer__c" :"Vehicle",
			"Integration_Type__c" :"CSERVE",
			},

			{ "Case__c" :this.case_id,
			"Question__c" :"PRIORITY",
			"Answer__c" :"Normal",
			"Integration_Type__c" :"CSERVE"
			},

			{"Case__c" :this.case_id,
			"Question__c" :"CITIZENSERVE USER",
			"Answer__c" :"GIS Layer Vehicle Abatement Officer",
			"Integration_Type__c" :"CSERVE"
			}]

		const homeless_concern=[
			{"Case__c" :this.case_id,
			"Question__c" :"CASE STATUS",
			"Answer__c" :"New",
			"Integration_Type__c" :""
			},
			{
			"Case__c" :this.case_id,
			"Question__c" :"PRIORITY",
			"Answer__c" :"Normal",
			"Integration_Type__c" :""
			}]

		const homeless_trash_concern=[
			{"Case__c" :this.case_id,
			"Question__c" :"CASE STATUS",
			"Answer__c" :"New",
			"Integration_Type__c" :""
			},
			{
			"Case__c" :this.case_id,
			"Question__c" :"PRIORITY",
			"Answer__c" :"Normal",
			"Integration_Type__c" :""
			}]

		const homeless_sidewalk=[
			{"Case__c" :this.case_id,
			"Question__c" :"CASE STATUS",
			"Answer__c" :"New",
			"Integration_Type__c" :""
			},
			{
			"Case__c" :this.case_id,
			"Question__c" :"PRIORITY",
			"Answer__c" :"Normal",
			"Integration_Type__c" :""
			}]
			
		
		const Dead_Private_Property=[{ "Case__c" :this.case_id,
			"Question__c" :"CHAMELEON ACTIVITY TYPE",
			"Answer__c" :"DEAD PP",
			"Integration_Type__c" :"CHML",
			},
			{ "Case__c" :this.case_id,
			"Question__c" :"CHAMELEON ACTIVITY SUB TYPE",
			"Answer__c" :"DEAD PP",
			"Integration_Type__c" :"CHML"
			},
			{  "Case__c" :this.case_id,
			"Question__c" :"CHAMELEON PRIORITY",
			"Answer__c" :4,
			"Integration_Type__c" :"CHML"
			}]

		
		const Dead_Right_of_Way=[{"Case__c" :this.case_id,
			"Question__c" :"CHAMELEON ACTIVITY TYPE",
			"Answer__c" :"DEAD ST",
			"Integration_Type__c" :"CHML"},
			{  "Case__c" :this.case_id,
			"Question__c" :"CHAMELEON ACTIVITY SUB TYPE",
			"Answer__c" :"DEAD ST",
			"Integration_Type__c" :"CHML"},
				{ "Case__c" :this.case_id,
			"Question__c" :"CHAMELEON PRIORITY",
			"Answer__c" :4,
			"Integration_Type__c" :"CHML"
				}]

		const Relamp=[{  "Case__c" :this.case_id,
			"Question__c" :"INFOR JOB TYPE",
			"Answer__c" :"CORRECTIVE",
			"Integration_Type__c" :"Infor"
			},
				{ "Case__c" :this.case_id,
			"Question__c" :"INFOR CLASS",
			"Answer__c" :"OTHER",
			"Integration_Type__c" :"Infor"
			},
			{ "Case__c" :this.case_id,
			"Question__c" :"INFOR STATUS",
			"Answer__c" :"RELEASED",
			"Integration_Type__c" :"Infor"
			},
				{"Case__c" :this.case_id,
			"Question__c" :"INFOR STANDARD WO",
			"Answer__c" :"RLMP",
			"Integration_Type__c" :"Infor"
			},
			{ "Case__c" :this.case_id,
			"Question__c" :"Asset Id",
			"Answer__c" :"SLL-LIGHTING",
			"Integration_Type__c" :"Infor",
			"Integration_Tag__c" :"Asset Id"
			}]
		
		// TODO: Is it okay I added "vehicle on street" to the map here?
		let subject_map = {'dead animal':Dead_Right_of_Way,"dead":Dead_Right_of_Way,
						'abandoned vehicle':Vehicle_On_Street,"vehicle on":Vehicle_On_Street,"vehicle":Vehicle_On_Street,"vehicle on street":Vehicle_On_Street,
						'relamp':Relamp, 'concern':homeless_concern, 'homeless camp- trash':homeless_trash_concern, 'homeless encampment blocking sidewalk':homeless_sidewalk}
		
		let output = null;
		// console.log(service_type.toLowerCase());
		// console.log(Object.keys(subject_map));
		// let keys = Object.keys(subject_map);
		// let subject = service_type.toLowerCase();
		if (subject_map.hasOwnProperty(service_type.toLowerCase())) { 
			output = subject_map[service_type.toLowerCase()];
			this.new_caseq = output;
			return output;
		} else {
			console.log('case_question_new(): service type not found in subject map')
			return false;
		}
	}

	  


	/**
	 * Generate a new token for the Salesforce Case Object. Used for subsequent
	 * calls to the API throughout a session.
	 */
	async generate_new_token() {
		this.token = await helper.getOAuthToken();
	}

};


// Dictionary mapping the input fields (slot names) with Salesforce fields
const mappings = {
	'make': 'Vehicle Make',
	'model': 'Vehicle Model',
	'licensePlate': 'License Plate Number',
	'timePeriod': '# of Days Abandoned',
	'color': 'Vehicle Color',
	'animal_location':"Please select where the animal is located",
	'animal_type':"Type of Animal",
	'animal_count':"Animal Total",
	'address':"Address",
	'case_id':"case_id",
	'wood_pole':'wood_pole',
	'pole_damaged' :'pole_damaged',
	'animal_property' :'animal_property',
	'relamp_problem_description':"Work Order Description",
	'property_type': 'Is the camp on private or public property?',
	'no_of_people': 'How many people at the camp',
	'children_present': 'Are there any children ?',
	'animals_present': 'Are there any animals?',
	'camp_on_sidewalk': 'Is this camp on a sidewalk?',
	'criminal_activity': 'Is there criminal activity taking place?',
	'sidewalk_no_of_people': 'How many people at the camp?',
	'sidewalk_children_present': 'Are there any children?',
	'sidewalk_animals_present': 'Are there any animals?'
	}

const gis_to_sf_mapping = {
	15: {'NAME': 'Drainage Basin Name'},
	14: {'RAINB': 'Rain Patrol B'},
	13: {'RAINA': 'Rain Patrol A'},
	12: {'OFFICER': 'Graffiti Officer Name'},
	11: {'OFFICER': 'Code Officer Name'},
	10: {'PAGE': 'Thomas Brothers Page', 'TB_ROW': 'Row', 'TB_COL': 'Column'},
	1:{'STREET ID': "Street ID"},
	9: {'DISTRICT': 'School District'},
	5: {'CITY_NAME': 'City Name'},
	4: {'NAME': 'Neighborhood Name'},
	0: {'DTPR_FLAG': 'Downtown Parking Restricted',
	'SERVICE_DAY': 'Garbage/Recycling service day',
	'RECYCLE_WEEK': 'Recycle week',
	'ROUTE': 'Recycle Route',
	'OP_AREA': 'Solid Waste Service Area'},
	2: {'DISTRICT': 'Water District'},
	3: {'ZIP5': 'Zip Code'},
	6: {'BEAT': 'Police Beat Number'},
	7: {'DISTRICT': 'Police District'},
	8: {'DISTNUM': 'Council District'},
	16: {'TILENUM': 'GIS Map Book Tile Number'},
	17: {'DISTRICT': 'Animal Care District'},
	18: {'NAME': 'Sewer Basin Name'},
	19: {'BEAT_NUM': 'Parking Beat Number'},
	25: {'MAINTSUP': 'Park Supervisor'},
	28: {'ROUTE': 'Garbage Route'},
	29: {'ROUTE': 'Lawn/Garden Route'},
	34: {'ZI_OFFICER': 'Zoning Investigator'},
	35: {'VA_OFFICER': 'Vehicle Abatement Officer'},
	36: {'H_OFFICER': 'Housing Inspector'},
	38: {'SW_OFFICER': 'Solid Waste Code Officer'},
	39: {'NSA': 'Neighborhood Service Area'},
	37: {'ADDRESSID':'ADDRESSID',
		'APN':'APN',
		'NAME':'Owner Name',
		'ISPRIMARY':'ISPRIMARY',
		'MAIL_ADDRE':'Owner Street Address',
		'MAIL_CITY':'Owner City',
		'MAIL_STATE':'Owner State',
		'MAIL_ZIP':'Owner Zip',
		'SITUSADDRESS':'Situs Address',
		'RECYCLE_DAY': 'Recycle Day',
		'RECYCLE_ROUTE': 'Recycle Route',
		'GARBAGE_DAY': ['Garbage/Recycling service day','Garbage Day'],
		'GARBAGE_ROUTE': 'Garbage Route',
		'LAWN_DAY': 'Lawn/Garden Day',
		'LAWN_ROUTE': 'Lawn/Garden Route'},
	22: {'NETSEGMENTID': 'Street ID'},
	23: {'PRIVATE': 'PRIVATE',
		'C1STRNAME': 'Cross Street',
		'C2STRNAME': 'C2STRNAME'}
}


  const service_type_to_sf_service = {'dead animal':'Dead',
                      'abandoned vehicle':'Vehicle',
                      'relamp':'Relamp', 'building department': 'Building Department', 'planning': 'Planning', 'homeless camp concern': 'Concern', 'homeless trash concern': 'Homeless Camp- Trash', 'homeless sidewalk concern': 'Homeless Encampment Blocking Sidewalk'}


module.exports = Salesforce_Case_object;

