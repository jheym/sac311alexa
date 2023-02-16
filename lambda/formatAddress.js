
/*
Fixes the Speech Output for Alexa to better address format to register location 
*/
function formatInput(input){
    //synonym maps
    //Still need to add more
    const wordMap = {
        "eye": "I",
        "you": "U",
        "sea": "C",
        "apartment" : "APT.",
        "aye pee tee" : "APT.",
        "jay": "j",
    };
    const numberMap = {
        "zero": 0,
        "one": 1,
        "two": 2,
        "three": 3,
        "four": 4,
        "five": 5,
        "six": 6,
        "seven": 7,
        "eight": 8,
        "nine": 9,
        "ten": 10,
        "eleven": 11,
        "twelve": 12,
        "thirteen": 13,
        "fourteen": 14,
        "fifteen": 15,
        "sixteen": 16,
        "seventeen": 17,
        "eighteen": 18,
        "nineteen": 19,
        "twenty": 2,
        "thirty": 3,
        "forty": 4,
        "fifty": 5,
        "sixty": 6,
        "seventy": 7,
        "eighty": 8,
        "ninety": 9,
        "hundred": 1,
        "thousand": 1,
        " ":"",
        
    }
    /*
    Converts words to their synonym and as well as numercial words to numerical numbers.
    */
    let words = input.toLowerCase().split(' ');
    let formattedWords = [];
    let inNumber = false;
    let number = 0;
    for (let i = 0; i < words.length; i++) {
        let word = words[i];
        let formattedWord = '';
        if (wordMap[word]) {
            formattedWord = wordMap[word];
        } else if (numberMap[word]) {
            if (inNumber && numberMap[word] < 100) {
                number += numberMap[word];
               
                
            }else if (numberMap[word] > 1000){

                console.log("invalid ZipCode");
                
            } else {
                inNumber = true;
                number = numberMap[word];
                
            }
           
        } else if (/^\d+$/.test(word)) {
            inNumber = true;
            number = Number(word);
            
        } else {
            inNumber = false;
            formattedWord = word;
        }
        if (inNumber && (i == words.length - 1 || !numberMap[words[i+1]] || numberMap[words[i+1]] < 100)) {
            formattedWord = number.toString();
           
            number = 0;
            inNumber = false;
        }
        formattedWords.push(formattedWord);
    }
   
    let formattedInput = formattedWords.join(' ');
   

   //gets rid of spaces between numbers 
        while(/\d\s+\d/.test(formattedInput)){
    
        formattedInput = formattedInput.replace(/\d\s+\d/g, match => match.replace(/\s+/g, ''));
        }
    console.log(formattedInput);
    
    return formattedInput;
}



//formatInput("eye street"); // Output: "I street"
//formatInput("sea street Apartment"); // Output: "I street"
//formatInput("eye street Ninety thousand eight hundred twenty five");
//formatInput('two two Waterloo Avenue Nine eight five six five Sacramento');


