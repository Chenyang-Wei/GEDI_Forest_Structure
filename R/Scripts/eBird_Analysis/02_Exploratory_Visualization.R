# ##############################################################################
# Introduction:
#   1) Visualize the pre-processed eBird data and their effort variables.
# 
# Last updated: 3/7/2024.
# ##############################################################################


# 1) Setup ----------------------------------------------------------------

# Load packages.
library(sf)
library(tidyverse)
library(ggspatial)
library(gridExtra)

# Set the theme of plots.
theme_set(theme_bw())

# Set the working directory.
setwd("C:/Postdoc/NSF_LiDAR-Birds/LiDAR-Birds")


# 2) Dataset loading ------------------------------------------------------

# Read the pre-processed eBird data of all the selected species.
gpkg_FilePath <- "Results/Forest_Species_CA_NV.gpkg"

allSpecies_sf <- st_read(
  dsn = gpkg_FilePath,
  layer = "zerofilled_AllSpecies",
  stringsAsFactors = TRUE)

glimpse(allSpecies_sf)
summary(allSpecies_sf)

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

# Transform the CRS of the study area.
studyArea_Transformed <- studyArea |> 
  st_transform(crs = st_crs(allSpecies_sf))

glimpse(studyArea_Transformed)


# 3) eBird observation visualization --------------------------------------

## 3.1 All observations
allObs_BySpecies <- 
  ggplot() +
  # Add a base map.
  annotation_map_tile(type = "cartolight",
                      zoom = 7) +
  # Study area.
  geom_sf(data = studyArea_Transformed, 
          fill = "transparent", 
          color = "black", 
          size = 1) +
  # Non-detection.
  geom_sf(data = allSpecies_sf |> 
            filter(!species_observed),
          alpha = 0.1,
          color = "#555555",
          size = 0.1, 
          shape = 19) + 
  # Detection.
  geom_sf(data = allSpecies_sf |> 
            filter(species_observed),
          aes(color = scientific_name),
          alpha = 0.1,
          size = 0.1, 
          shape = 19) +
  facet_wrap(~ scientific_name,
             nrow = 1) +
  labs(title = "eBird Observations During 2019-2022",
       subtitle = "(Sierra Nevada, US)") +
  theme(
    plot.title = element_text(hjust = 0.5, face = "bold"),
    plot.subtitle = element_text(hjust = 0.5),
    legend.position = "none",
    axis.text = element_text(size = 6)
  ) +
  coord_sf(crs = 4326) # Ensure proper aspect ratio.

# allObs_BySpecies


## 3.2 Detection only
detection_BySpecies <- 
  ggplot() +
  # Add a base map.
  annotation_map_tile(type = "cartolight",
                      zoom = 7) +
  # Study area.
  geom_sf(data = studyArea_Transformed, 
          fill = "transparent", 
          color = "black", 
          size = 1) +
  # Detection.
  geom_sf(data = allSpecies_sf |> 
            filter(species_observed),
          aes(color = scientific_name),
          alpha = 0.1,
          size = 0.1, 
          shape = 19) +
  facet_wrap(~ scientific_name,
             nrow = 1) +
  labs(title = "Detection Observations During 2019-2022",
       subtitle = "(Sierra Nevada, US)") +
  theme(
    plot.title = element_text(hjust = 0.5, face = "bold"),
    plot.subtitle = element_text(hjust = 0.5),
    legend.position = "none",
    axis.text = element_text(size = 6)
  ) +
  coord_sf(crs = 4326) # Ensure proper aspect ratio.

# Output the maps.
png(filename = "Results/Figures/detection_BySpecies.png", 
    width = 2000, height = 1000, 
    units = "px", res = 200)
detection_BySpecies
dev.off()


# 4) Effort variable visualization ----------------------------------------

# Select a set of checklists.
checklists <- allSpecies_sf |> 
  st_drop_geometry() |> 
  filter(scientific_name == "Certhia americana")


## 4.1 Time of day
# Summarize data by hourly bins.
hourBreaks <- seq(0, 24)

hourLabels <- hourBreaks[-length(hourBreaks)] + diff(hourBreaks) / 2

checklists_Time <- allSpecies_sf |> 
  st_drop_geometry() |> 
  mutate(hour_bins = cut(hours_of_day, 
                         breaks = hourBreaks, 
                         labels = hourLabels,
                         include.lowest = TRUE),
         hour_bins = as.numeric(as.character(hour_bins))) |> 
  group_by(hour_bins, scientific_name) |> 
  summarise(n_Checklists = n(),
            n_Detected = sum(species_observed),
            det_Freq = mean(species_observed))

# Histogram of checklists.
time_Hist <- ggplot(checklists_Time) +
  aes(x = hour_bins, y = n_Checklists) +
  geom_segment(aes(xend = hour_bins, y = 0, yend = n_Checklists),
               color = "grey50") +
  geom_point() +
  scale_x_continuous(breaks = seq(0, 24, by = 3), 
                     limits = c(0, 24)) +
  scale_y_continuous(labels = scales::comma) +
  labs(x = "Hours since midnight",
       y = "Checklists",
       title = "Distribution of Observation Start Times") +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"))

time_Hist

# Frequency of detection.
time_Freq <- ggplot(checklists_Time |> 
                      filter(n_Checklists > 100),
                    aes(color = scientific_name)) +
  aes(x = hour_bins, y = det_Freq) +
  geom_line() +
  geom_point() +
  scale_color_discrete(name = "Scientific name") +
  scale_x_continuous(breaks = seq(0, 24, by = 3), limits = c(0, 24)) +
  scale_y_continuous(labels = scales::percent) +
  labs(x = "Hours since midnight",
       y = "Checklists with detections",
       title = "Detection Frequency") +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"),
        legend.position = "bottom",
        legend.title = element_text(face = "bold")) +
  guides(color = guide_legend(nrow = 2,
                              byrow = TRUE))

time_Freq

# Combine and output the two plots.
png(filename = "Results/Figures/time_of_day.png", 
    width = 2000, height = 2000, 
    units = "px", res = 300)
grid.arrange(time_Hist, time_Freq, 
             ncol = 1, 
             heights = c(3, 4))
dev.off()


## 4.2 Checklist duration
# Summarize data by hour long bins.
durationBreaks <- seq(0, 6)

durationLabels <- durationBreaks[-length(durationBreaks)] + diff(durationBreaks) / 2

checklists_Duration <- allSpecies_sf |> 
  st_drop_geometry() |> 
  mutate(duration_bins = cut(effort_hours, 
                             breaks = durationBreaks, 
                             labels = durationLabels,
                             include.lowest = TRUE),
         duration_bins = as.numeric(as.character(duration_bins))) |> 
  group_by(duration_bins, scientific_name) |> 
  summarise(n_Checklists = n(),
            n_Detected = sum(species_observed),
            det_Freq = mean(species_observed))

# Histogram of checklists.
duration_Hist <- ggplot(checklists_Duration) +
  aes(x = duration_bins, y = n_Checklists) +
  geom_segment(aes(xend = duration_bins, y = 0, yend = n_Checklists),
               color = "grey50") +
  geom_point() +
  scale_x_continuous(breaks = durationBreaks) +
  scale_y_continuous(labels = scales::comma) +
  labs(x = "Duration [hours]",
       y = "Checklists",
       title = "Distribution of Checklist Duration") +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"))

duration_Hist

# Frequency of detection.
duration_Freq <- ggplot(checklists_Duration |> 
                      filter(n_Checklists > 100),
                    aes(color = scientific_name)) +
  aes(x = duration_bins, y = det_Freq) +
  geom_line() +
  geom_point() +
  scale_color_discrete(name = "Scientific name") +
  scale_x_continuous(breaks = durationBreaks) +
  scale_y_continuous(labels = scales::percent) +
  labs(x = "Duration [hours]",
       y = "Checklists with detections",
       title = "Detection Frequency") +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"),
        legend.position = "bottom",
        legend.title = element_text(face = "bold")) +
  guides(color = guide_legend(nrow = 2,
                              byrow = TRUE))

duration_Freq

# Combine and output the two plots.
png(filename = "Results/Figures/checklist_duration.png", 
    width = 2000, height = 2000, 
    units = "px", res = 300)
grid.arrange(duration_Hist, duration_Freq, 
             ncol = 1, 
             heights = c(3, 4))
dev.off()


## 4.3 Distance traveled
# Summarize data by 1-km bins.
distBreaks <- seq(0, 10)

distLabels <- distBreaks[-length(distBreaks)] + diff(distBreaks) / 2

checklists_Dist <- allSpecies_sf |> 
  st_drop_geometry() |> 
  mutate(dist_bins = cut(
    effort_distance_km,
    breaks = distBreaks,
    labels = distLabels,
    include.lowest = TRUE),
    dist_bins = as.numeric(as.character(dist_bins))) |> 
  group_by(dist_bins, scientific_name) |> 
  summarise(n_Checklists = n(),
            n_Detected = sum(species_observed),
            det_Freq = mean(species_observed))

# Histogram of checklists.
dist_Hist <- ggplot(checklists_Dist) +
  aes(x = dist_bins, y = n_Checklists) +
  geom_segment(aes(xend = dist_bins, 
                   y = 0, yend = n_Checklists),
               color = "grey50") +
  geom_point() +
  scale_x_continuous(breaks = distBreaks) +
  scale_y_continuous(labels = scales::comma) +
  labs(x = "Distance traveled [km]",
       y = "Checklists",
       title = "Distribution of Distance Traveled") +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"))

dist_Hist

# Frequency of detection.
dist_Freq <- ggplot(checklists_Dist |> 
                      filter(n_Checklists > 100),
                    aes(color = scientific_name)) +
  aes(x = dist_bins, y = det_Freq) +
  geom_line() +
  geom_point() +
  scale_color_discrete(name = "Scientific name") +
  scale_x_continuous(breaks = distBreaks) +
  scale_y_continuous(labels = scales::percent) +
  labs(x = "Distance traveled [km]",
       y = "Checklists with detections",
       title = "Detection Frequency") +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"),
        legend.position = "bottom",
        legend.title = element_text(face = "bold")) +
  guides(color = guide_legend(nrow = 2,
                              byrow = TRUE))

dist_Freq

# Combine and output the two plots.
png(filename = "Results/Figures/distance_traveled.png", 
    width = 2000, height = 2000, 
    units = "px", res = 300)
grid.arrange(dist_Hist, dist_Freq, 
             ncol = 1, 
             heights = c(3, 4))
dev.off()


## 4.4 Number of observers
# Summarize data.
obsBreaks <- seq(0, 10)

obsLabels <- seq(1, 10)

checklists_Obs <- allSpecies_sf |> 
  st_drop_geometry() |> 
  mutate(obs_bins = cut(
    number_observers,
    breaks = obsBreaks,
    labels = obsLabels,
    include.lowest = TRUE),
    obs_bins = as.numeric(as.character(obs_bins))) |> 
  group_by(obs_bins, scientific_name) |> 
  summarise(n_Checklists = n(),
            n_Detected = sum(species_observed),
            det_Freq = mean(species_observed))

# Histogram of checklists.
obs_Hist <- ggplot(checklists_Obs) +
  aes(x = obs_bins, y = n_Checklists) +
  geom_segment(aes(xend = obs_bins, 
                   y = 0, yend = n_Checklists),
               color = "grey50") +
  geom_point() +
  scale_x_continuous(breaks = obsBreaks) +
  scale_y_continuous(labels = scales::comma) +
  labs(x = "Observers",
       y = "Checklists",
       title = "Distribution of the Number of Observers") +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"))

obs_Hist

# Frequency of detection.
obs_Freq <- ggplot(checklists_Obs |> 
                      filter(n_Checklists > 100),
                    aes(color = scientific_name)) +
  aes(x = obs_bins, y = det_Freq) +
  geom_line() +
  geom_point() +
  scale_color_discrete(name = "Scientific name") +
  scale_x_continuous(breaks = obsBreaks) +
  scale_y_continuous(labels = scales::percent) +
  labs(x = "Observers",
       y = "Checklists with detections",
       title = "Detection Frequency") +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"),
        legend.position = "bottom",
        legend.title = element_text(face = "bold")) +
  guides(color = guide_legend(nrow = 2,
                              byrow = TRUE))

obs_Freq

# Combine and output the two plots.
png(filename = "Results/Figures/number_of_observers.png", 
    width = 2000, height = 2000, 
    units = "px", res = 300)
grid.arrange(obs_Hist, obs_Freq, 
             ncol = 1, 
             heights = c(3, 4))
dev.off()

