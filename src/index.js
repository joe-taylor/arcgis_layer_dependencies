const axios = require('axios');
const YAML = require('yaml');

const SEARCH_ENDPOINT = "https://governmentofbc.maps.arcgis.com/sharing/rest/search";

async function getAllSearchResults() {
  let results = [];
  let page = 1;

  do {
    if (page > 10) throw new Error("Too many pages! Something probably went wrong.");
    var result = await getPageOfSearchResults(page);
    results = [...results, ...result.results]
    page++;
  } while (~result.nextStart);

  return results;
}

async function getPageOfSearchResults(page) {
  let params = new URLSearchParams('num=100&start=1&sortField=&sortOrder=desc&q=%20orgid%3Aubm4tcTYICKBpist%20(type%3A("Web%20Map"%20OR%20"CityEngine%20Web%20Scene")%20-type%3A"Web%20Mapping%20Application")%20%20-type%3A"Code%20Attachment"%20-type%3A"Featured%20Items"%20-type%3A"Symbol%20Set"%20-type%3A"Color%20Set"%20-type%3A"Windows%20Viewer%20Add%20In"%20-type%3A"Windows%20Viewer%20Configuration"%20-type%3A"Map%20Area"%20-typekeywords%3A"MapAreaPackage"%20-type%3A"Indoors%20Map%20Configuration"%20-typekeywords%3A"SMX"&f=json');
  params.set("start", page * 100 - 99);
  let requestUrl = `${SEARCH_ENDPOINT}?${params}`

  let result = await axios.get(requestUrl);

  return result.data; // for simplicity's sake, we just assume every request goes through
}

async function main() {
  let allResults = await getAllSearchResults();

  console.log(YAML.stringify(allResults.map(result => ({
    id: result.id,
    title: result.title,
    tags: result.tags,
    numViews: result.numViews
  }))));
}


// ----------
// Run script
// ----------

main();