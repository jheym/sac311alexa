/*
  This function formats the address input to be more readable by the API
*/
function formatInput(input){
  // This is a map of words to abbreviations
    const wordMap = {
        "eye": "I",
        "you": "U",
        "ice cream": "I",
        "sea": "C",
        "apartment" : "APT.",
        "aye pee tee" : "APT.",
        "ice" : "I",
        "see" : "C",
        "tree": "ST",
        "jay": "J",
        "oh" : "O",
        "are": "R",
        "street" : "ST",
        "avenue" : "AVE",
        "road" : "RD",
        "drive" : "DR",
        "court" : "CT",
        "boulevard" : "BLVD",
        "circle" : "CIR",
        "lane" : "LN",
        "place" : "PL",
        "parkway" : "PKWY",
        "highway" : "HWY",
        "square" : "SQ",
        "way" : "WAY",
        "&" : "and",  
    };
        
    
    let formattedInput = input;
    // This loop replaces the words in the input with the abbreviations
    for (let word in wordMap) {
      // This regex matches the word in the input
      const regex = new RegExp(`(?:\\b|\\B&)${word}(?:\\b|\\B)`, "gi");
      // This replaces the word with the abbreviation
      formattedInput = formattedInput.replace(regex, wordMap[word]);

    }
    //Returns the formatted input
    return formattedInput;
    
  
}
/*  This function parses the address and returns an object with the address components.
    If the address does not match the regex, it returns null.
*/
function parseAddress(input){
    //Create a regex to parse the address even with missing components 
    const addressRegex =/(?<addressLine1>\d+\s+[\w\s.]+)\s(?<city>[\w\s]+),?\s(?<stateOrRegion>[A-Z]{2})\s(?<postalCode>\d{5}(?:-\d{4})?)/;


      const match = input.match(addressRegex)

//If the address matches the regex, create an object with the address components
      if (match) {
        // Seperates the address components into variables
        const { addressLine1, city, stateOrRegion, postalCode } = match.groups;
        // Creates an object with the address components
        const address = {
          addressLine1: addressLine1,
          city: city,
          stateOrRegion: stateOrRegion,
          postalCode: postalCode
        }
       console.log(address);

        return address;
      } else {
        return null;
      }
    }
//Test input 
//let addy = formatInput("100 I ST Sacramento CA 94203");
//parseAddress(addy);



module.exports = {formatInput};

