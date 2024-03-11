# ##############################################################################
# Introduction:
#   1) Process and filter the unzipped eBird datasets.
# 
# Last updated: 3/6/2024.
# ##############################################################################


# 1) Setup ----------------------------------------------------------------

# Load packages.
library(auk) # eBird Data Extraction and Processing in R.
library(tidyverse)
library(sf)
library(ggspatial) # Visualization.

# Set the theme of plots.
theme_set(theme_bw())

# Set the working directory.
setwd("C:/Postdoc/NSF_LiDAR-Birds/LiDAR-Birds")


# 2) Dataset loading ------------------------------------------------------

# Define the file path of eBird data.
filePath_data <- file.path(
  "Data",
  "eBird",
  "Forest_Species_CA_NV"
)

# Create a list of eBird folder names.
folderNames_List <- dir(filePath_data)
folderNames_List <- folderNames_List[- 11]

# Load the Sampling Event Data (checklists) 
#   of each selected species in California/Nevada.
fileName_Suffix <- "_sampling.txt"

datasets_AllSpecies <- c()

for (folderName in folderNames_List) {
  
  fileName_OneSpecies <- paste0(folderName, fileName_Suffix)
  
  filePath_OneSpecies <- file.path(
    filePath_data,
    folderName,
    fileName_OneSpecies
  )
  
  # Read the dataset of each selected species. 
  dataset_OneSpecies <- read_sampling(filePath_OneSpecies)
  
  datasets_AllSpecies <- rbind(
    datasets_AllSpecies,
    dataset_OneSpecies
  )
  
  print(fileName_OneSpecies)
}

checklists_AllSpecies <- datasets_AllSpecies

# Check the loaded data.
glimpse(checklists_AllSpecies)

checklists_AllSpecies |> 
  distinct(state)

checklists_AllSpecies |> 
  group_by(state) |> 
  summarise(
    meanDate = mean(observation_date, na.rm = TRUE),
    count = n()
  )

# Load the eBird Basic Dataset (observations)
#   of each selected species in California/Nevada.
fileName_Suffix <- ".txt"

datasets_AllSpecies <- c()

for (folderName in folderNames_List) {
  
  fileName_OneSpecies <- paste0(folderName, fileName_Suffix)
  
  filePath_OneSpecies <- file.path(
    filePath_data,
    folderName,
    fileName_OneSpecies
  )
  
  # Read the dataset of each selected species. 
  dataset_OneSpecies <- read_ebd(filePath_OneSpecies)
  
  datasets_AllSpecies <- rbind(
    datasets_AllSpecies,
    dataset_OneSpecies
  )
  
  print(fileName_OneSpecies)
}

observations_AllSpecies <- datasets_AllSpecies

# Check the loaded data.
glimpse(observations_AllSpecies)

observations_AllSpecies |> 
  distinct(common_name)

observations_AllSpecies |> 
  group_by(common_name) |> 
  summarise(
    meanDate = mean(observation_date, na.rm = TRUE),
    count = n()
  )

# Load the study area.
studyArea <- st_read(
  dsn = file.path(
    "Data",
    "Study_Sites",
    "Sierra_Nevada_US_GMBAv2_Standard",
    "Sierra_Nevada_US_GMBAv2_Standard.shp"
  ),
  stringsAsFactors = TRUE
)

glimpse(studyArea)


# 3) Temporal filtering ---------------------------------------------------

# Determine the study years and months.
startYear <- 2019
endYear <- 2022
startMonth <- 6
endMonth <- 8

# Filter the checklists to the study period.
checklists_Filtered <- checklists_AllSpecies |> 
  filter(
    all_species_reported, # Complete checklists.
    between(year(observation_date), startYear, endYear),
    between(month(observation_date), startMonth, endMonth)
  )

checklists_Filtered |> 
  select(observation_date) |> 
  summary()

nrow(checklists_Filtered) # 1,999,540.

# Filter the observations to the study period.
observations_Filtered <- observations_AllSpecies |> 
  filter(
    all_species_reported, # Complete checklists.
    between(year(observation_date), startYear, endYear),
    between(month(observation_date), startMonth, endMonth)
  )

observations_Filtered |> 
  select(observation_date) |> 
  summary()

nrow(observations_Filtered) # 164,829.


# 4) Spatial filtering ----------------------------------------------------

# Convert the checklists to point features.
checklists_Filtered_sf <- checklists_Filtered |> 
  st_as_sf(coords = c("longitude", "latitude"),
           crs = 4326)

# Transform the CRS of the study area.
studyArea_Transformed <- studyArea |> 
  st_transform(crs = st_crs(checklists_Filtered_sf))

# Spatially subset the checklists to those within the study area.
checklists_inStudyArea_sf <- checklists_Filtered_sf |> 
  st_filter(studyArea_Transformed)

nrow(checklists_inStudyArea_sf) # 167,970.

# Convert sf object to a regular data frame.
checklists_inStudyArea <- checklists_inStudyArea_sf |> 
  st_drop_geometry()

# Add the coordinates back.
checklistCoords <- checklists_inStudyArea_sf |> 
  st_coordinates() |> 
  as.data.frame()

checklists_inStudyArea <- checklists_inStudyArea |> 
  mutate(
    longitude = checklistCoords$X,
    latitude = checklistCoords$Y
  )

# Remove observations outside the study area or without matching checklists.
observations_inStudyArea <- observations_Filtered |> 
  semi_join(checklists_inStudyArea, 
            by = "checklist_id")

nrow(checklists_inStudyArea) # 167,970.
nrow(observations_inStudyArea) # 33,534.

# Zero-fill the data.
zerofilled <- auk_zerofill(
  observations_inStudyArea, 
  checklists_inStudyArea, 
  collapse = TRUE
)

glimpse(zerofilled)

zerofilled |> 
  group_by(scientific_name) |> 
  summarise(
    count = n()
  )


# 5) Effort variable filtering --------------------------------------------

# Function to convert time to a decimal value.
time_to_decimal <- function(x) {
  x <- hms(x, quiet = TRUE)
  hour(x) + minute(x) / 60 + second(x) / 3600
}

# Variable transformation.
zerofilled <- zerofilled |> 
  mutate(
    # Convert count to integer and X to NA,
    #   and ignore the warning "NAs introduced by coercion".
    observation_count = as.integer(observation_count),
    
    # Convert effort_distance_km to 0 for stationary counts.
    effort_distance_km = if_else(protocol_type == "Stationary", 
                                 0, 
                                 effort_distance_km),
    
    # Convert duration to hours.
    effort_hours = duration_minutes / 60,
    
    # Calculate speed in km/h.
    effort_speed_kmph = effort_distance_km / effort_hours,
    
    # Convert the start time to decimal hours since midnight.
    hours_of_day = time_to_decimal(time_observations_started),
    
    # Split the observation date into year and day of year.
    year = year(observation_date),
    day_of_year = yday(observation_date)
  )

# Filter observations based on the effort variables.
zerofilled_Filtered <- zerofilled |> 
  filter(protocol_type %in% c("Stationary", "Traveling"),
         effort_hours <= 6,
         effort_distance_km <= 10, # For 3-km spatial resolution.
         effort_speed_kmph <= 100,
         number_observers <= 10)


# 6) Result output --------------------------------------------------------

# Remove redundant variables.
zerofilled_Filtered <- zerofilled_Filtered |> 
  select(
    scientific_name,
    checklist_id, observer_id,
    observation_count, species_observed, 
    state_code, locality_id, latitude, longitude,
    protocol_type, all_species_reported,
    observation_date, year, day_of_year,
    hours_of_day, 
    effort_hours, effort_distance_km, effort_speed_kmph,
    number_observers
  )

glimpse(zerofilled_Filtered)

# Convert the dataset to point features.
zerofilled_Filtered_sf <- zerofilled_Filtered |> 
  st_as_sf(coords = c("longitude", "latitude"),
           crs = 4326)

# Create a GeoPackage file.
gpkg_FilePath <- "Results/Forest_Species_CA_NV.gpkg"

if (!dir.exists(dirname(gpkg_FilePath))) {
  dir.create(dirname(gpkg_FilePath))
}

# Save the point features.
st_write(obj = zerofilled_Filtered_sf,
         dsn = gpkg_FilePath,
         layer = "zerofilled_AllSpecies",
         delete_layer = TRUE)


# 7) Visualization --------------------------------------------------------

zerofilled_Map <- 
  ggplot() +
  # Add a base map.
  annotation_map_tile(type = "cartolight",
                      zoom = 7) +
  # Plot polygons.
  geom_sf(data = studyArea_Transformed, 
          fill = "transparent", 
          color = "black", 
          size = 1) +
  # Plot points on top.
  geom_sf(data = zerofilled_Filtered_sf, 
          color = alpha("#4daf4a", 0.1), 
          size = 0.1, 
          shape = 19) +
  # Customize plot appearance.
  labs(title = "Five Common Forest Species",
       subtitle = "(Sierra Nevada, US)") +
  theme(
    plot.title = element_text(hjust = 0.5),
    plot.subtitle = element_text(hjust = 0.5),
    legend.position = "none"
  ) +
  coord_sf(crs = 4326) # Ensure proper aspect ratio.

# zerofilled_Map

# Output the map.
map_FilePath <- "Results/Figures/zerofilled_Map.png"

if (!dir.exists(dirname(map_FilePath))) {
  dir.create(dirname(map_FilePath))
}

png(filename = map_FilePath, 
  width = 1500, height = 3000, 
  units = "px", res = 400)
zerofilled_Map
dev.off()

