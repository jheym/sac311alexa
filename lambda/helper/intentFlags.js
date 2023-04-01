// Mappings for interceptor to set sessionAttribute variables based on the intent
// If current intent is one of the intent mappings, set sessionAttributes to the following values
const intentFlags = {
    AbandonedVehicleIntent : {
        intentName : 'AbandonedVehicleIntent',
        flags : {
            getGeolocation : true,
            getAddress : true
        }
    },
    HomelessCampIntent : {
        intentName : 'HomelessCampIntent',
        flags : {
            getGeolocation : true,
            getAddress : false
        }
    }
}

module.exports = { intentFlags };