## "Best Practices for Using eBird Data"
## Source: https://ebird.github.io/ebird-best-practices/ebird.html
## Last updated: 2/26/2024.


###### Chapter 1: Introduction and Setup ######

# 1.4 Setup ---------------------------------------------------------------

## 1.4.3 R packages

if (!requireNamespace("remotes", quietly = TRUE)) {
  install.packages("remotes")
}

remotes::install_github("ebird/ebird-best-practices")


## 1.4.5 GIS data

library(dplyr)
library(rnaturalearth)
library(sf)
library(ebirdst) # grid_sample_stratified().

setwd("C:/Research_Projects/Bird/eBird")

# File to save spatial data.
gpkg_file <- "data/gis-data.gpkg"

dir.create(dirname(gpkg_file),
           showWarnings = FALSE,
           recursive = TRUE)

# Political boundaries (land border with lakes removed).
ne_land <- ne_download(
  scale = 50,
  category = "cultural",
  type = "admin_0_countries_lakes",
  returnclass = "sf") |> 
  filter(CONTINENT %in% c("North America", "South America")) |> 
  st_set_precision(1e6) |> 
  st_union()

# Country boundaries.
ne_countries <- ne_download(
  scale = 50,
  category = "cultural",
  type = "admin_0_countries_lakes",
  returnclass = "sf") |> 
  select(country = ADMIN, country_code = ISO_A2)

# State boundaries for the United States.
ne_states <- ne_download(
  scale = 50,
  category = "cultural",
  type = "admin_1_states_provinces",
  returnclass = "sf") |> 
  filter(iso_a2 == "US") |> 
  select(state = name, state_code = iso_3166_2)

# Country lines.
#   Download the global result and then filter to North America with
#   st_intersect().
ne_country_lines <- ne_download(
  scale = 50,
  category = "cultural",
  type = "admin_0_boundary_lines_land",
  returnclass = "sf") |> 
  st_geometry()

lines_on_land <- st_intersects(
  ne_country_lines,
  ne_land,
  sparse = FALSE
) |> 
  as.logical()

ne_country_lines <- ne_country_lines[lines_on_land]

# State lines in North America.
ne_state_lines <- ne_download(
  scale = 50,
  category = "cultural",
  type = "admin_1_states_provinces_lines",
  returnclass = "sf"
) |> 
  filter(ADM0_A3 %in% c("USA", "CAN")) |> 
  mutate(iso_a2 = recode(ADM0_A3, USA = "US", CAN = "CAN")) |> 
  select(country = ADM0_NAME, country_code = iso_a2)

# Save all layers to a geopackage.
unlink(gpkg_file)
write_sf(ne_land, gpkg_file, "ne_land")
write_sf(ne_countries, gpkg_file, "ne_countries")
write_sf(ne_states, gpkg_file, "ne_states")
write_sf(ne_country_lines, gpkg_file, "ne_country_lines")
write_sf(ne_state_lines, gpkg_file, "ne_state_lines")


# 1.5 Session info --------------------------------------------------------

# List the versions of all R packages.
devtools::session_info()



###### Chapter 2: eBird Data ######

# 2.4 Importing eBird data into R -----------------------------------------

library(auk) # eBird Data Extraction and Processing in R.
library(dplyr)
library(ggplot2)
library(gridExtra)
library(lubridate)
library(readr)
library(sf)

setwd("C:/Research_Projects/Bird/eBird")

# Read the checklist data (i.e., Sampling Event Data (SED)).
f_sed <- file.path("data",
                   "Mountain-Bluebird_CA",
                   "ebd_US-CA_moublu_smp_relJan-2024_sampling.txt")

checklists <- read_sampling(f_sed)

glimpse(checklists) # More info: eBird_Basic_Dataset_Metadata_v1.15.pdf

# Make a histogram of the distribution of distance traveling 
#   for traveling protocol checklists.
checklists_Traveling <- 
  checklists |> 
  filter(protocol_type == "Traveling")

ggplot(checklists_Traveling) +
  aes(x = effort_distance_km) +
  geom_histogram(
    aes(y = after_stat(count / sum(count))),
    binwidth = 1, 
    fill = "darkgreen", 
    color = "white") +
  scale_y_continuous(
    limits = c(0, NA),
    labels = scales::label_percent()) +
  labs(
    x = "Distance traveled [km]",
    y = "Percentage of eBird checklists",
    title = "Distribution of distance traveled on eBird checklists"
  )

# Make a histogram of the distribution of observation date.
checklists_ObservationDate <- 
  checklists|> 
  select(observation_date, protocol_type)

checklists_ObservationDate$observation_Year <- 
  checklists_ObservationDate$observation_date|> 
  substring(1, 4)|> 
  as.numeric()

checklists_ObservationDate |> 
  ggplot() +
  aes(x = observation_Year) +
  geom_histogram(
    aes(y = after_stat(count / sum(count))),
    binwidth = 2, 
    fill = "darkblue", 
    color = "white") +
  scale_y_continuous(
    limits = c(0, NA),
    labels = scales::label_percent()) +
  labs(
    x = "Observation year",
    y = "Percentage of eBird checklists",
    title = "Observation year of eBird checklists"
  )

# Import the observation data/eBird Basic Dataset (EBD).
f_ebd <- file.path("data",
                   "Mountain-Bluebird_CA",
                   "ebd_US-CA_moublu_smp_relJan-2024.txt")

observations <- read_ebd(f_ebd)

# By default when a "read" function from "auk" is used:
#   1) Variable name and type cleanup.
#   2) Collapsing shared checklist.
#   3) Taxonomic rollup.

glimpse(observations)


## 2.4.1 Shared checklists

# Checklists with the same group_identifier 
#   provide duplicate information on the same birding event 
#   in the eBird database.
checklists_shared <- read_sampling(f_sed, unique = FALSE)

# Identify shared checklists.
checklists_shared |> 
  filter(!is.na(group_identifier)) |> 
  arrange(group_identifier) |> 
  select(group_identifier, sampling_event_identifier) |> 
  print(n = 15)
# You can inspect a checklist on the eBird website 
#   by appending the "sampling_event_identifier" to 
#   the URL https://ebird.org/checklist/.

# Collapse the shared checklists.
checklists_unique <- auk_unique(
  checklists_shared, 
  checklists_only = TRUE)
nrow(checklists_shared) # 6964386.
nrow(checklists_unique) # 5786275.

# Check the newly created "checklist_id" variable.
head(checklists_unique) # S*: non-shared.
tail(checklists_unique) # G*: shared.

# Check the checklists and observers contributing to
#   a shared checklist.
checklists_unique |> 
  filter(checklist_id == "G7641022") |> 
  select(checklist_id, 
         group_identifier, 
         sampling_event_identifier, 
         observer_id)


## 2.4.2 Taxonomic rollup

# Import one of the auk example datasets without rolling up taxonomy.
obs_ex <- 
  system.file("extdata/ebd-rollup-ex.txt", package = "auk") |> 
  read_ebd(rollup = FALSE)

# Rollup taxonomy.
obs_ex_rollup <- auk_rollup(obs_ex)

# Identify the taxonomic categories present in each dataset.
unique(obs_ex$category)
unique(obs_ex_rollup$category)

# Without rollup, there are four observations.
obs_ex |>
  filter(common_name == "Yellow-rumped Warbler") |> 
  select(checklist_id, 
         category, 
         common_name, 
         subspecies_common_name, 
         observation_count)

# With rollup, they have been combined.
obs_ex_rollup |>
  filter(common_name == "Yellow-rumped Warbler") |> 
  select(checklist_id, 
         category, 
         common_name, 
         observation_count)


# 2.5 Filtering to study region and season --------------------------------

# Filter the checklist data.
checklists <- checklists |> 
  filter(all_species_reported, # Keep complete checklists.
         between(year(observation_date), 2019, 2022),
         between(month(observation_date), 6, 8))

# Check the result.
checklists |> 
  arrange(observation_date) |> 
  select(observation_date, all_species_reported) |> 
  first()

checklists |> 
  arrange(observation_date) |> 
  select(observation_date, all_species_reported) |> 
  last()

# Filter the observation data.
observations <- observations |> 
  filter(all_species_reported, # Keep complete checklists.
         between(year(observation_date), 2019, 2022),
         between(month(observation_date), 6, 8))

# Check the result.
observations |> 
  arrange(observation_date) |> 
  select(observation_date, all_species_reported) |> 
  first()

observations |> 
  arrange(observation_date) |> 
  select(observation_date, all_species_reported) |> 
  last()

# Convert checklist locations to point features.
checklists_sf <- checklists |> 
  select(checklist_id, latitude, longitude) |> 
  st_as_sf(coords = c("longitude", "latitude"), crs = 4326)

head(checklists_sf)
nrow(checklists_sf)

# Boundary of the study region (California), buffered by 1 km.
study_region_buffered <- 
  read_sf("data/gis-data.gpkg", layer = "ne_states") |>
  filter(state_code == "US-CA") |>
  st_transform(crs = st_crs(checklists_sf)) |>
  st_buffer(dist = 1000)

plot(study_region_buffered)

# Spatially subset the checklists to those in the study region.
in_region <- checklists_sf[study_region_buffered, ]

nrow(in_region)

# Remove checklists outside region.
checklists <- semi_join(checklists, in_region, by = "checklist_id")
observations <- semi_join(observations, in_region, by = "checklist_id")

# Remove observations without matching checklists.
observations <- semi_join(observations, checklists, by = "checklist_id")


# 2.6 Zero-filling --------------------------------------------------------

# Zero-filling:
#   For a species, if there is a record in the SED but no record in the EBD, 
#   then a count of zero individuals of that species can be inferred.
zf <- auk_zerofill(observations, checklists, collapse = TRUE)
# Combine the EBD and SED datasets into a single data frame.

# Function to convert the observation time to hours since midnight.
time_to_decimal <- function(x) {
  x <- hms(x, quiet = TRUE)
  hour(x) + minute(x) / 60 + second(x) / 3600
}

# Clean up variables.
zf <- zf |> 
  mutate(
    # Convert count to integer and X to NA
    #   ignore the warning "NAs introduced by coercion".
    observation_count = as.integer(observation_count),
    # Convert effort_distance_km to 0 for stationary counts.
    effort_distance_km = if_else(protocol_type == "Stationary", 
                                 0, 
                                 effort_distance_km),
    # Convert duration to hours.
    effort_hours = duration_minutes / 60,
    # Calculate speed in km/h.
    effort_speed_kmph = effort_distance_km / effort_hours,
    # Convert the observation time to decimal hours since midnight.
    hours_of_day = time_to_decimal(time_observations_started),
    # Split the observation date into year and day of year.
    year = year(observation_date),
    day_of_year = yday(observation_date)
  )


# 2.7 Accounting for variation in effort ----------------------------------

# Restrict checklists to "traveling" or "stationary" 
#   counts less than 6 hours in duration and 10 km in length, 
#   at speeds below 100km/h, and with 10 or fewer observers.
zf_filtered <- zf |> 
  filter(protocol_type %in% c("Stationary", "Traveling"),
         effort_hours <= 6,
         effort_distance_km <= 10,
         effort_speed_kmph <= 100,
         number_observers <= 10)
# 10-km traveling checklists: 
#   94% are contained within a 1.5 km radius circle,
#   74% have location error less than 500 m.
# For making predictions at weekly temporal resolution and 
#   3-km spatial resolution.

# Check the remaining variations.
ggplot(zf_filtered) +
  aes(x = effort_hours) +
  geom_histogram(
    aes(y = after_stat(count / sum(count))),
    binwidth = 0.25, 
    fill = "darkgreen", 
    color = "white") +
  scale_y_continuous(
    limits = c(0, NA),
    labels = scales::label_percent()) +
  labs(
    x = "Duration [hours]",
    y = "% of eBird checklists",
    title = "Distribution of eBird checklist duration"
  )

ggplot(zf_filtered) +
  aes(x = effort_distance_km) +
  geom_histogram(
    aes(y = after_stat(count / sum(count))),
    binwidth = 0.25, 
    fill = "darkblue", 
    color = "white") +
  scale_y_continuous(
    limits = c(0, NA),
    labels = scales::label_percent()) +
  labs(
    x = "Distance [km]",
    y = "% of eBird checklists",
    title = "Distribution of eBird checklist distance"
  )

ggplot(zf_filtered) +
  aes(x = effort_speed_kmph) +
  geom_histogram(
    aes(y = after_stat(count / sum(count))),
    binwidth = 2, 
    fill = "orange", 
    color = "white") +
  scale_y_continuous(
    limits = c(0, NA),
    labels = scales::label_percent()) +
  labs(
    x = "Speed [km/h]",
    y = "% of eBird checklists",
    title = "Distribution of eBird checklist speed"
  )

ggplot(zf_filtered) +
  aes(x = number_observers) +
  geom_histogram(
    aes(y = after_stat(count / sum(count))),
    binwidth = 1, 
    fill = "purple", 
    color = "white") +
  scale_y_continuous(
    limits = c(0, NA),
    labels = scales::label_percent()) +
  labs(
    x = "# of observers",
    y = "% of eBird checklists",
    title = "Distribution of eBird checklist observer #"
  )


# 2.8 Test-train split ----------------------------------------------------

# Randomly split the data into 80% of checklists for training 
#   and 20% for testing.
zf_filtered$type <- if_else(
  runif(nrow(zf_filtered)) <= 0.8, 
  "train", "test")

# Confirm the proportion in each set is correct.
table(zf_filtered$type) / nrow(zf_filtered)

# Remove redundant variables.
checklists <- zf_filtered |> 
  select(checklist_id, observer_id, type,
         observation_count, species_observed, 
         state_code, locality_id, latitude, longitude,
         protocol_type, all_species_reported,
         observation_date, year, day_of_year,
         hours_of_day, 
         effort_hours, effort_distance_km, effort_speed_kmph,
         number_observers)

write_csv(checklists, 
          "data/Mountain-Bluebird_CA/checklists-zf_moublu_Summer_US-CA.csv", 
          na = "")


# 2.9 Exploratory analysis and visualization ------------------------------

# Load the GIS data.
ne_land <- read_sf("data/gis-data.gpkg", "ne_land") |> 
  st_geometry()
ne_country_lines <- read_sf("data/gis-data.gpkg", "ne_country_lines") |> 
  st_geometry()
ne_state_lines <- read_sf("data/gis-data.gpkg", "ne_state_lines") |> 
  st_geometry()
study_region <- read_sf("data/gis-data.gpkg", "ne_states") |> 
  filter(state_code == "US-CA") |> 
  st_geometry()

# Prepare the eBird data for mapping.
checklists_sf <- checklists |> 
  # Convert the data to point features.
  st_as_sf(coords = c("longitude", "latitude"), crs = 4326) |> 
  select(species_observed)

## Create and output a map.
if (!dir.exists("results")) {
  dir.create("results")
}

png(filename = "results/eBird_Observation_Map.png",
    width = 1440, height = 1440, units = "px",
    res = 200)

par(mar = c(0.25, 0.25, 4, 0.25))

# Set up the plot area.
plot(st_geometry(checklists_sf), 
     main = "Mountain Bluebird eBird Observations\nSummer 2019-2022",
     col = NA, border = NA)

# Add the GIS data.
plot(ne_land, 
     col = "#cfcfcf", border = "#888888", lwd = 0.5, add = TRUE)

plot(study_region, 
     col = "#e6e6e6", border = NA, add = TRUE)

plot(ne_state_lines, 
     col = "#ffffff", lwd = 0.75, add = TRUE)

plot(ne_country_lines, 
     col = "#ffffff", lwd = 1.5, add = TRUE)

# Plot the eBird observations.
#   Not observed.
plot(filter(checklists_sf, 
            !species_observed),
     pch = 19, cex = 0.1, 
     col = alpha("#555555", 0.25),
     add = TRUE)

#   Observed.
plot(filter(checklists_sf, 
            species_observed),
     pch = 19, cex = 0.3, 
     col = alpha("#4daf4a", 1),
     add = TRUE)

# Add a legend.
legend("bottomleft", bty = "n",
       col = c("#555555", "#4daf4a"),
       legend = c("eBird checklist", 
                  "Mountain Bluebird sighting"),
       pch = 19)

box()

dev.off()


# Optional: Subsampling ---------------------------------------------------

# Set random number seed for reproducibility.
set.seed(1)

# Sample one checklist per 3km x 3km x 1 week grid for each year.
#   (Sample detection/non-detection independently.)
checklists_ss <- grid_sample_stratified(checklists,
                                        obs_column = "species_observed",
                                        sample_by = "type")

nrow(checklists) # 358608.

nrow(checklists_ss) # 117322.

write_csv(checklists_ss, 
          "data/Mountain-Bluebird_CA/checklists-ss_moublu_Summer_US-CA.csv", 
          na = "")

# Convert checklists to spatial features.
all_pts <- checklists |>  
  # filter(type == "train") |> 
  st_as_sf(coords = c("longitude","latitude"), crs = 4326) |>
  select(species_observed)

ss_pts <- checklists_ss |>  
  # filter(type == "train") |> 
  st_as_sf(coords = c("longitude","latitude"), crs = 4326) |>
  select(species_observed)

both_pts <- list(
  before_ss = all_pts, 
  after_ss = ss_pts)

## Create two maps for comparison.
png(filename = "results/eBird_Sub-sampling.png",
    width = 2880, height = 1440, units = "px",
    res = 200)

p <- par(mfrow = c(1, 2))

for (i in seq_along(both_pts)) {
  
  par(mar = c(0.25, 0.25, 0.25, 0.25))
  
  # Set up the plot area.
  plot(st_geometry(both_pts[[i]]), col = NA)
  
  # Add the GIS data.
  plot(ne_land, 
       col = "#dddddd", border = "#888888", lwd = 0.5, add = TRUE)
  
  plot(study_region, 
       col = "#cccccc", border = NA, add = TRUE)
  
  plot(ne_state_lines, 
       col = "#ffffff", lwd = 0.75, add = TRUE)
  
  plot(ne_country_lines, 
       col = "#ffffff", lwd = 1.5, add = TRUE)
  
  # Plot the eBird observations.
  #   Not observed.
  plot(both_pts[[i]] |> 
         st_geometry(),
       pch = 19, cex = 0.1, 
       col = alpha("#555555", 0.25),
       add = TRUE)
  
  #   Observed.
  plot(both_pts[[i]] |> 
         filter(species_observed) |> 
         st_geometry(),
       pch = 19, cex = 0.3, 
       col = alpha("#4daf4a", 0.5),
       add = TRUE)
  
  # Add a legend.
  legend("bottomleft", bty = "n",
         col = c("#555555", "#4daf4a"),
         legend = c("Non-detection", 
                    "Detection"),
         pch = 19)
  
  box()
  
  par(new = TRUE, 
      mar = c(0, 0, 3, 0))
  
  if (names(both_pts)[i] == "before_ss") {
    title("Before subsampling")
  } else {
    title("After subsampling")
  }
}

dev.off()

# Output a SHP file.
checklists_ss_sf <- checklists_ss |>  
  st_as_sf(coords = c("longitude","latitude"), crs = 4326)

checklists_ss_sf$Detection <- checklists_ss_sf$species_observed |> 
  as.numeric()

if(!dir.exists("data/Mountain-Bluebird_CA/Sub-sampling")) {
  dir.create("data/Mountain-Bluebird_CA/Sub-sampling")
}

st_write(checklists_ss_sf,
         "data/Mountain-Bluebird_CA/Sub-sampling/checklists-ss.shp",
         delete_layer = TRUE)

