// Load CHIRPS pentad data
var chirpsCollection = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').select("precipitation");
                      // .filterDate('1981-01-01', '2023-06-30');

// Load the LSIB 2017 dataset
var lsib2017 = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017');

// Filter the LSIB dataset to get Kenya's boundary
var kenyaBoundary = lsib2017.filter(ee.Filter.eq('country_na', 'Kenya'));

// Define a list of years from 1981 to 2022
var years = ee.List.sequence(1981, 2022);
// Define a list of months from January to December
var months = ee.List.sequence(1, 12);

// Creates total monthly images for every year
var monthlyImages = years.map(function(year){
  return months.map(function(month){
    var filtered = chirpsCollection
    .filter(ee.Filter.calendarRange(year, year, 'year'))
    .filter(ee.Filter.calendarRange(month, month, 'month'));
    var monthly = filtered.sum();
    return monthly.set({'month': month, 'year': year});
  })
}).flatten();

// create an image collection for all years and months from 1981-2022
var monthlyPrep = ee.ImageCollection.fromImages(monthlyImages);
Map.addLayer(monthlyPrep.first().clip(kenyaBoundary), imageVisParam, "Monthly Image Visualization");
// Only print 5 images
print(monthlyPrep.limit(5));

// prepare params for exporting to google drive
var exportParams = {
  fileFormat: 'GeoTIFF',
  folder: 'CHIRPS_Monthly_Images_Kenya', // Export to a specific folder in your drive.
  scale: 5566, // Set your desired scale (e.g., 5566 meters default for CHIRPS PENTAD image collection)
  crs: 'EPSG:4326', // Set your desired projection
  formatOptions: {
    cloudOptimized: true
  }
};
  
// get the size of images in the image collection
var imageList = monthlyPrep.toList(monthlyPrep.size());
var numImages = imageList.size().getInfo();
// For loop that creates tasks to export images to drive
for(var i = 0; i < numImages; i++){
  //get images from list
  var image = ee.Image(imageList.get(i));


  // Get year and month from each image properties
  // they will be used to create a unique name for each image from CHIRPS
  var year = ee.Number(image.get('year')).toInt();
  var month = ee.Number(image.get('month')).toInt();
  
  // update params and clip kenya images
  exportParams.image = image.clip(kenyaBoundary);
  exportParams.fileNamePrefix = "chirps_" + year.getInfo() + "_month_" + month.getInfo();
  
  //export images
  Export.image.toDrive(exportParams);
}