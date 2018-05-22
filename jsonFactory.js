// Reads lines of items and converts them to object
// and write into json file

var fs = require('fs');
var inputFile = 'FOOD_ITEMS';
var outputFile = 'output.json';
var lineReader = require('readline').createInterface({
  input: fs.createReadStream(inputFile)
});

var items = [];

lineReader.on('line', (line) => {
  let obj = {};
  obj.name = {};
  obj.name.value = line;

	items.push(obj);

}).on('close', () => {
	createJsonFile();
});

var createJsonFile = () => {
	fs.writeFile(outputFile, JSON.stringify(items, undefined, 2), (err) => {
    if(err) throw err;
    console.log('Saved to', outputFile);
  });
}

// "values": [
//     {
//         "name": {
//             "value": "Madison"
//         }
//     },
//     {
//         "name": {
//             "value": "Emma"
//         }
//     }
// ]



// fs.appendFile('output.json', output, (err) => {
// 	console.log('Unable to append to output.json');
// });