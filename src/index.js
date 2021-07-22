const axios = require('axios');
const YAML = require('yaml');
const fs = require('fs');

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

async function getMapLayers(mapId) {
  let endpoint = `https://governmentofbc.maps.arcgis.com/sharing/rest/content/items/${encodeURIComponent(mapId)}/data?f=json`;
  let result = await axios.get(endpoint);

  if (result.data.operationalLayers) {
    return result.data.operationalLayers.map(layer => ({
      id: layer.id,
      itemId: layer.itemId,
      title: layer.title
    }));
  } else {
    return [];
  }
}

async function getDetailedLayer(layerItemId) {
  const endpoint = `https://governmentofbc.maps.arcgis.com/sharing/rest/content/items/${encodeURIComponent(layerItemId)}?f=json`;
  
  const result = (await axios.get(endpoint)).data;
  if (result.error) {
    console.warn(`Unable to get detailed layer for id ${layerItemId} due to ${JSON.stringify(result.error)}`);
    return null;
  }

  return result;
}

async function validateIfLayerUrlWorks(layerUrl){
  const result = (await axios.get(`${layerUrl}?f=json`)).data;
  // there are cases when auth is required {"error":{"code":499,"message":"Token Required","details":[]}}
  if (result.error && result.error.code !== 499) {
    throw new Error(JSON.stringify(result.error));
  }
}

function getRelevantMaps(maps, detailedLayer) {
  const filteredMaps = maps.filter(map => map.layers.some(layer => layer.itemId === detailedLayer.id));

  return filteredMaps.map(m => ({
    id: m.id,
    title: m.title,
    numViews: m.numViews,
  }));
}

async function main() {
  let allResults = (await getAllSearchResults()).map(result => ({
    id: result.id,
    title: result.title,
    tags: result.tags,
    numViews: result.numViews
  }));

  let n = 1;
  const uniqueLayerItemIds= new Set;

  for (let map of allResults) {
    console.warn(`${n++}/${allResults.length} Getting layer information for ${map.title}`);
    map.layers = await getMapLayers(map.id);

    for (let layer of map.layers) {
      if (layer.itemId) {
        uniqueLayerItemIds.add(layer.itemId);
      }
    }
  }

  fs.writeFileSync('reports/maps.yml', YAML.stringify(allResults));

  const detailedLayerPromises = [...uniqueLayerItemIds].map(layerItemId => getDetailedLayer(layerItemId));
  const detailedLayers = (await Promise.all(detailedLayerPromises)).filter(rv => rv !== null);

  // insert extra key "isWorking" to detailedLayer
  for (let detailedLayer of detailedLayers) {
    try  {
      await validateIfLayerUrlWorks(detailedLayer.url);

      detailedLayer.isWorking = true;
    } catch (e) {
      detailedLayer.isWorking = false;
    }
  }

  // transform object so it's layers as top level instead of maps
  const layersAsTopLevel = detailedLayers.map(detailedLayer => {
    const { id, url, title, isWorking} = detailedLayer;

    return {
      id,
      title,
      url,
      isWorking,
      maps: getRelevantMaps(allResults, detailedLayer),
    }
  });

  fs.writeFileSync('reports/layers.yml', YAML.stringify(layersAsTopLevel));
}

// ----------
// Run script
// ----------

main();
