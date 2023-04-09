// Currently not in use.
// Mappings for interceptor to set sessionAttribute variables based on the intent
// Set flags here if you want each intent to get a location 

const intentFlags = {
    AbandonedVehicleIntent : {
        intentName : 'AbandonedVehicleIntent',
        flags : {
            getGeolocation : true,
            getHomeAddress : false
        }
    },
    HomelessCampIntent : {
        intentName : 'HomelessCampIntent',
        flags : {
            getGeolocation : true,
            getHomeAddress : false
        }
    },
    GetGarbageDayIntent : {
        intentName : 'GetGarbageDayIntent',
        flags : {
            getGeolocation : false,
            getHomeAddress : true
        }
    }
}

module.exports = { intentFlags };