// [ToDo] deal with multiple things in one house

// global map object
var map
var overlay
var data
var geoJSON

function loaded(dat) {
  data = dat;
  setupMap(mk_geoJSON('today'));
}

function merge(obj, oobj={}) {
   Object.keys(obj).forEach( key => {
    if(typeof oobj[key] === 'undefined')
      oobj[key] = obj[key];
  });
  return oobj    
}

function mk_geoJSON(today) {
  var features = []

  // Handle VoKues
  if (today == "all"){
    var vokues = Object.keys(data.kuefas).reduce(
      function(ret, key) {
	data.kuefas[key].reduce(function(ret, el){
	  if( typeof ret[el.name] == 'undefined') {
	    var new_el = merge(el);
	    new_el.desc = key +' : '+ el.desc +'<br/>'
	    new_el.time = null
	    ret[el.name] = new_el;
	  } else {
	    ret[el.name].desc += key +' : '+ el.desc +'<br/>'
	  }
	  return ret
	}, ret)
	return ret
      }, {})
  } else {
    if (today == 'today')
      var today = Object.keys(data.kuefas)[new Date().getDay()-1];
    console.log(today)
    var vokues = data.kuefas[today].reduce(
      function(carry, el, index, obj){
	carry[el.name] = merge(el);
	return carry
      }, {});
  }

  // Handle events
  var events = data.events.reduce(
    function(carry, el, index, obj){
      if(el.location) {
	carry[el.location] = merge(el);
      } else if (el.coordinates) {
	features.push( {
	  type: 'Feature',
	  geometry: {
	    type: 'Point',
	    coordinates: el.coordinates
	  },
	  properties: {
	    title: el.type,
	    description: $.Mustache.render('infowindow',{event:el}),
            'marker-size': 'medium',
	    'marker-color': '#A517A5',
	    'marker-symbol': 'star',
	    events: true
	  }
	} )
      } else {
	console.log("strange things happen by el creation: ",el)
      }
      return carry
    }, {});
  

  data.stressfaktoren.forEach(function(e) {
    var color = '#641207';
    var symbol = 'danger';
    var has_vokue = false;
    var has_event = false;
    var title = e.name
    var msg = ""
    if(typeof vokues[e.name] == 'object') {
      e.vokue = vokues[e.name];
      vokues[e.name] = undefined;
      color = '#17A5A5'
      var symbol = 'restaurant'
      var has_vokue = true;
    }
    if(typeof events[e.name] == 'object') {
      e.event = events[e.name];
      events[e.name] = undefined;
      color = '#A517A5';
      var symbol = 'star'
      var has_event = true;
    }
    var msg = $.Mustache.render('infowindow', e);
    if (!e.coordinates) {
      console.error("no coordinates for : ", e)
    } else {
      features.push( {
	type: 'Feature',
	geometry: {
	  type: 'Point',
	  coordinates: e.coordinates
	},
	properties: {
	  title: title,
	  description: msg,
          'marker-size': 'medium',
	  'marker-color': color,
	  'marker-symbol': symbol,
	  vokues: has_vokue,
	  events: has_event
	}
      } )
    }
  });

  var geo = {
    "type": "FeatureCollection",
    "features": features
  };

  console.log("vokues not found : ", Object.keys(vokues).reduce(function(c,e) {vokues[e] ? c[e] = vokues[e] : null; return c},{}));
  console.log("events not found : ", Object.keys(events).reduce(function(c,e) {events[e] ? c[e] = events[e] : null; return c},{}));

  geoJSON = geo;
  return geo;
}

function setupMap(geoJSON, filter) {
  //console.log('geoJSON  :  '+JSON.stringify(geoJSON,null,2));
  console.log('geoJSON  :  ', geoJSON);
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

  overlay.clearLayers();
  
  var groups = {};
  ['vokues', 'events', 'stressfaktoren'].forEach( thing => {
    groups[thing] = new L.MarkerClusterGroup({
      maxClusterRadius: 50,
      disableClusteringAtZoom: 15,
      iconCreateFunction: createIcon.bind(null, thing),
    }).addTo(overlay);
  });
  
  var features = L.mapbox.featureLayer(geoJSON).eachLayer( function(layer) {
    if( (typeof filter === 'undefined')
	|| ( typeof filter === 'function' && filter(layer) )
      ) {
      if (layer.feature.properties.events) {
	groups.events.addLayer(layer);
      } else if (layer.feature.properties.vokues) {
	groups.vokues.addLayer(layer);
      } else {
	groups.stressfaktoren.addLayer(layer)
      }
    }
  });
  
}

function init() {
  // SetUp map
  L.mapbox.accessToken = 'pk.eyJ1IjoiZ2dyaW4iLCJhIjoiY2ltYjljMnJhMDAya3dmbTZ1d3hzNGVzbyJ9.jpe-T4LzCNjdpByfbHrJOA';
  map = L.mapbox.map('map', 'mapbox.streets')

  map.setView([52.5072095, 13.4], 10);
    
  // Legend
  var symbols = {
    danger: 'StressFaktoren',
    restaurant: 'VoKues',
    star: 'Events'
  }

  overlay = L.layerGroup().addTo(map);
  // filtering
  var legend_items = $('.legend')
  legend_items.each( (i, el) => {
    el.addEventListener('click',  e => {
      var type = el.classList[0]
      if(type == 'stressfaktoren')
	setupMap(geoJSON);
      else {
	setupMap(geoJSON, layer => {
	  return layer.feature.properties[type]
	})
      }
      legend_items.each( (i, thing) => {
	thing.classList.remove('active');
      });
      el.classList.add('active');
    });
  });
  
  //set day of the week
  $('select#today').on('change', function(e,f) {
    var val = e.target.value
    if(val) {
      setupMap(mk_geoJSON(val));
    }
  })

  // infowindow
  $.Mustache.add('infowindow', $('#infowindow').html());
  console.log($.Mustache.render('infowindow', {}))
  
  // Load Data
  var urls = ['kuefas.json', 'events.json', 'stressfaktoren.json'];
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
      , charset: 'utf-8'
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
