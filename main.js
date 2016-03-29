// [ToDo] deal with multiple things in one house

// global map object
var map

function loaded(data) {
  var features = []
  var today = Object.keys(data.kuefas)[new Date().getDay()-1];
  console.log(today)
  var vokues = data.kuefas[today].reduce(function(carry, el, index, obj){
    carry[el.name] = el
    return carry
  }, {});
  data.stressfaktoren.forEach(function(e) {
    var color = '#641207';
    var symbol = 'danger';
    var has_vokue = false;
    var msg =  '<span style="color:#A4A4A4;float:right">'+
	e./*full_*/address+'</span><br/>'+ e.info;
    if(typeof vokues[e.name] == 'object') {
      e.vokue = vokues[e.name];
      vokues[e.name] = undefined;
      var color = '#17A5A5'
      var symbol = 'restaurant'
      var msg = '<span style="color:'+ color +';float:right">'+ e.vokue.desc +'</span><br/>'+ msg;
      var has_vokue = true;
    }
    
    
    features.push( {
      type: 'Feature',
      geometry: {
	type: 'Point',
	coordinates: [e.lng, e.lat]// e.coordinates
      },
      properties: {
	title: e.name,
	description: msg,
        'marker-size': 'medium',
	'marker-color': color,
	'marker-symbol': symbol,
	vokue: has_vokue
      }
    } )
  });
  var geoJSON = {
    "type": "FeatureCollection",
    "features": features
  }
  setupMap(geoJSON);

  console.log("vokues not found : ", vokues);
}

function setupMap(geoJSON) {
  console.log(geoJSON)
  map.addControl(L.mapbox.geocoderControl('mapbox-places'))
  function createIcon(className, cluster) {
    var count = cluster.getChildCount();
    var size = 30
    for(i=1;count/(Math.pow(10,i)) >= 1; i++) {
      size+=10
    }
    return L.divIcon(
      { html: '<b style="position:relative;top:'
	          +Math.floor((size-30)/2) +'" >'
	       + count +'<b>',
	iconSize: [size,size],
	className: className+ ' cluster'
      });
  }
  
  vokue_group = new L.MarkerClusterGroup({
    maxClusterRadius: 50,
    disableClusteringAtZoom: 15,
    iconCreateFunction: createIcon.bind(null, 'vokue'),
  }).addTo(map);;

  locations_group =  new L.MarkerClusterGroup({
    maxClusterRadius: 50,
    disableClusteringAtZoom: 15,
    iconCreateFunction: createIcon.bind(null, 'stressfaktoren')
  }).addTo(map);

  var features = L.mapbox.featureLayer(geoJSON).eachLayer( function(layer) {
    if (layer.feature.properties.vokue)
      vokue_group.addLayer(layer)
    else
      locations_group.addLayer(layer)
  });    
}

function init() {
  // SetUp map
  L.mapbox.accessToken = 'pk.eyJ1IjoiZ2dyaW4iLCJhIjoiY2ltYjljMnJhMDAya3dmbTZ1d3hzNGVzbyJ9.jpe-T4LzCNjdpByfbHrJOA';
  map = L.mapbox.map('map', 'mapbox.streets', {
    legendControl: {
      position: "bottomleft",
      opacity: 0.7
    }
  }).setView([52.5072095, 13.4], 9);
    
  // Legend
  var symbols = {
    danger: 'StressFaktoren',
    restaurant: 'VoKue'
  }
  var legend = Object.keys(symbols).reduce(function(carry, val) {
    carry+= '<div class="'+ symbols[val].toLowerCase() +'Legend">'
      +'<img  class="symbol" src="http://localhost:3000/maki/'+ val +'-18.png"/>'
      +'<span >'+ symbols[val] +'</span></div>'
    return carry;
  }, "");
  map.legendControl.addLegend(legend);

  // hiding non vokues
  this.all_visible = true;
  $('.vokueLegend').on('click', function() {
    if (this.all_visible) {
      map.removeLayer(locations_group);
      this.all_visible = false;
    } else {
      locations_group.addTo(map);
      this.all_visible = true;
    }
  }.bind(this))
  $('.stressfaktorenLegend').on('click', function() {
    locations_group.addTo(map);
    this.all_visible = true;
  }.bind(this));

  // Load Data
  var urls = ['kuefas.json', 'stressfaktoren.json'];
  var data = {}
  function oneLoaded(key, dat){
    data[key] = dat;
    if (Object.keys(data).length == urls.length)
      loaded(data);
  }
  urls.forEach(function(url) {
    $.ajax({
      dataType: 'json'
      , url: url
      , success: function(data, status, jqXHR) {
	var key = url.replace(/\.[^.]*$/, '');
	if (status != 'success') {
	  console.error("can't load "+ name +' : ', status, data, jqXHR);
	  data = {};
	}
	oneLoaded(key, data);
      }
    });
  });
}

$(function() {
  init()
  console.log('initialized :)')
})
