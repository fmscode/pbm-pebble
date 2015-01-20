/**
 *  Pinball Map for Pebble
 *  Uses Pebble.js (http://developer.getpebble.com/guides/js-apps/pebble-js/)
 *  
 *  Written by: Frank Michael Sanchez
 *  GitHub: https://github.com/fmscode/pbm-pebble
 */
var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');

var APIURL = 'http://pinballmap.com/api/v1/'
var locationCoords = null;
var region = false;
var events = [];
var locationOptions = {
   enableHighAccuracy: true, 
   maximumAge: 10000, 
   timeout: 10000
};

// Cards
var nearestLocationCard = new UI.Card({
   title: 'Nearest Location',
   subtitle: 'Finding......',
   scrollable: true,
   action: {
      select: 'REFRESH_ACTION_IMAGE'
   }
});
nearestLocationCard.on('click','select',function(){
   reloadNearestLocationCard();
});
// Menus
var mainMenu = new UI.Menu({
   title: 'PBM Menu',
   sections: [
      {
         title: '',
         items: [
            {
               title: 'Nearest',
               icon: 'IMAGE_MENU_ICON'
            },
            {
               title: 'Recently',
               icon: 'IMAGE_RECENTS_ICON'
            },
            {
               title: 'Events',
               icon: 'IMAGE_EVENTS_ICON'
            }
         ]
      }
   ]
})
var recentsMenu = new UI.Menu({
   title: 'Recently Added Machines'
});
var eventsMenu = new UI.Menu({
   title: 'Upcoming Event'
});
// Menu interaction
mainMenu.on('select',function(indexPath){
   var indexRow = indexPath.itemIndex;
   if (indexRow == 0){
      reloadNearestLocationCard();
   }else if (indexRow == 1){
      recentlyAddedMachines();
   }else if (indexRow == 2){
      upcomingEvents();
   }
})
eventsMenu.on('select',function(indexPath){
   if (events.length > 0){
      var indexRow = indexPath.itemIndex;
      var eventSelected = events[indexRow];

      var eventCard = new UI.Card({
         title: eventSelected.name,
         subtitle: convertDateString(eventSelected.start_date),
         body: eventSelected.long_desc
      })
      eventCard.scrollable(true);
      eventCard.show();
   }
})
/**
*
*  Initial Splash Screen
*
*/
var splashWindow = new UI.Window();
var text = new UI.Text({
   position: new Vector2(0, 0),
   size: new Vector2(144, 168),
   text:'Finding nearest region',
   font:'GOTHIC_28_BOLD',
   color:'black',
   textOverflow:'wrap',
   textAlign:'center',
   backgroundColor:'white'
});
splashWindow.add(text);
splashWindow.show();
/**
*
*  Geolocation code.
*
*/
function locationSuccess(pos) {
   locationCoords = pos.coords;
   if (!region){
      // Don't have past data.
      findNearestLocations(function(location){
         console.log('Nearest Location Return'+location);
         regionInformation(location.region_id,function(regionFound){
            region = regionFound;
            splashWindow.hide();
            mainMenu.show();
         });
      });
   }
}
function locationError(err) {
   console.log('location error (' + err.code + '): ' + err.message);
}
navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);
/**
*
*  Nearest location
*
*/
function reloadNearestLocationCard(){
   nearestLocationCard.title('Nearest Location');
   nearestLocationCard.body('');
   nearestLocationCard.subtitle('Finding......');
   nearestLocationCard.show();

   navigator.geolocation.getCurrentPosition(function(pos){
      locationCoords = pos.coords;
      console.log('Found new geolocation');

      findNearestLocations(function(foundLocation){
         console.log(foundLocation.distance);

         nearestLocationCard.title(foundLocation.name);
         nearestLocationCard.body('\n'+foundLocation.street+', '+foundLocation.city);
         nearestLocationCard.subtitle((Math.round(foundLocation.distance*100)/100)+' mi');
      });
   }, locationError, locationOptions)
}
function findNearestLocations(completionBlock){
   var nearestURL = APIURL+'locations/closest_by_lat_lon.json?lat='+locationCoords.latitude+'&lon='+locationCoords.longitude;
   console.log(nearestURL);
   ajax(
      {
         url: nearestURL,
         type: 'json' 
      },
      function(data){
         console.log('Nearest Location Data Return: '+data.location.region_id);
         var location = data.location;
         completionBlock(location);
      },
      function(error){
         console.log('API Error'+error)
      }
   )
}
/**
*
*  Region information
*
*/
function regionInformation(regionID,completionBlock){
   ajax(
      {
         url: APIURL+'regions/'+regionID,
         type: 'json' 
      },
      function(data){
         var region = data.region;
         completionBlock(region);
      },
      function(error){
         console.log('API Error'+error)
      }
   )
}
/**
*
*  Recently Added
*
*/
function recentlyAddedMachines(){
   var recentURL = APIURL+'region/'+region.name+'/location_machine_xrefs.json?limit=6';
   console.log(recentURL);
   ajax(
      {
         url: recentURL,
         type: 'json' 
      },
      function(data){
         var machines = data.location_machine_xrefs;
         var machineItems = [];
         for (var i = machines.length - 1; i >= 0; i--) {
            var locationMachine = machines[i];
            var machineItem = {
               title: locationMachine.location.name,
               subtitle: locationMachine.machine.name
            }
            machineItems.push(machineItem)
         };
         var section = {
            title: region.display_name,
            items: machineItems
         }
         recentsMenu.section(0,section)
         recentsMenu.show();
      },
      function(error){
         console.log('API Error'+error)
      }
   )
}
/**
*
* Events
*
*/
function upcomingEvents(){
   var eventsURL = APIURL+'region/'+region.name+'/events.json';
   console.log(eventsURL);
   ajax(
      {
         url: eventsURL,
         type: 'json'
      },
      function(data){
         events = data.events
         var eventItems = [];
         if (events.length > 0){
            for (var i=0;i <= events.length-1;i++){
               var eventData = events[i];
               console.log(eventData);

               var eventItem = {
                  title: eventData.name,
                  subtitle: convertDateString(eventData.start_date)
               }
               eventItems.push(eventItem)
               if (eventItems.length == 5){
                  break;
               }
            }
         }else{
            eventItems = [{
               title: 'No Upcoming'
            }]
         }
         var eventSection = {
            title: region.display_name,
            items: eventItems
         }
         eventsMenu.section(0,eventSection);
         eventsMenu.show();
      },
      function(error){
         console.log('Events Error'+error);
      }
   )
}
function convertDateString(dateString){
   var date = new Date(dateString);
   return (date.getMonth()+1)+'/'+date.getDate()+'/'+date.getFullYear()
}






