# ##############################################################################
# Introduction:
#   1) Model the encounter rate of each species.
# 
# Last updated: 3/25/2024.
# ##############################################################################


# 1) Setup ----------------------------------------------------------------

# Load packages.
library(sf)
library(tidyverse)
library(gridExtra)
library(ranger) # Random forest.
library(scam) # Calibration.
library(ebirdst) # calculate_mcc_f1().
library(mccf1) # Thresholding.
library(reshape2) # Correlation matrix.
library(viridis) # Visualization.

# Set the theme of plots.
theme_set(theme_bw())

# Set the working directory.
setwd("C:/Postdoc/NSF_LiDAR-Birds/LiDAR-Birds")

# Set random number seed for reproducibility.
set.seed(17)


# 2) Training dataset loading ---------------------------------------------

# Read the sampled environmental variables of the training dataset.
trainingVars_sf <- st_read(
  dsn = file.path("Results", "sampledVars_CircularBuffers",
                  "Buf_Training_AllVars_SSd",
                  "Buf_Training_AllVars_SSd.shp"),
  stringsAsFactors = TRUE)

glimpse(trainingVars_sf)

trainingVars_sf |> 
  select(scntfc_) |> 
  summary()

# Convert the sf object to a regular data frame.
trainingVars_df <- trainingVars_sf |> 
  st_drop_geometry()

# Select only the columns to be used in the model.
training_Vars <- trainingVars_df |> 
  select(
    ## eBird columns.
    scntfc_, spcs_bs,
    year, 
    # dy_f_yr, hrs_f_d,
    # effrt_h, effrt_d_, effrt_s_,
    # nmbr_bs,
    
    ## Environmental variables.
    # NDVI.
    starts_with("ND_"),
    
    # Topography.
    starts_with("elv_"),
    starts_with("slp_"),
    starts_with("asp_"),
    
    # Forest land cover.
    starts_with("Df_"),
    starts_with("Ef_"),
    starts_with("Mf_"),
    
    # GEDI.
    starts_with("rh98_"),
    starts_with("cover_"),
    starts_with("fhd_"),
    starts_with("pai_"),
    
    # Empty images.
    starts_with("empty_"), # 30-m resolution.
    starts_with("emp_25m_") # 25-m resolution.
  )

# Rename the selected columns.
colnames(training_Vars) <- c(
  "scientific_Name", "species_Observed", 
  "year", 
  # "D_of_Y", "H_of_D",
  # "ef_Hours", "ef_Dist", "ef_Speed", 
  # "num_Obsr",
  
  "NDVI_mean", "NDVI_count", "NDVI_SD", 
  
  "elv_mean", "elv_count", "elv_SD", 
  "slope_mean", "slope_count", "slope_SD", 
  "aspect_SD", "aspect_count", "aspect_mean", 
  
  "Deci_F_SD", "Deci_F_mean", "Deci_F_count", 
  "Ever_F_mean", "Ever_F_count", "Ever_F_SD", 
  "Mix_F_mean", "Mix_F_count", "Mix_F_SD", 
  
  "rh98_SD", "rh98_mean", "rh98_count", 
  "cover_SD", "cover_count", "cover_mean", 
  "fhd_count", "fhd_SD", "fhd_mean", 
  "pai_SD", "pai_mean", "pai_count", 
  
  "EI_30m_mean", "EI_30m_count", "EI_30m_SD", # Empty Images.
  "EI_25m_SD", "EI_25m_count", "EI_25m_mean"
)

# Further select the variables to use for modeling.
training_Vars <- training_Vars |> 
  select(
    scientific_Name, species_Observed, year,
    
    NDVI_mean, NDVI_SD,
    
    elv_mean, elv_SD,
    slope_mean, slope_SD,
    aspect_mean, aspect_SD,
    
    Deci_F_count, Ever_F_count, Mix_F_count,
    
    rh98_mean, rh98_SD, rh98_count,
    cover_mean, cover_SD, cover_count,
    fhd_mean, fhd_SD, fhd_count,
    pai_mean, pai_SD, pai_count,
    
    EI_30m_count, EI_25m_count
  )

head(training_Vars)

# Keep observations with all the GEDI variables.
training_Vars <- training_Vars |> 
  filter(rh98_count > 0 & 
           cover_count > 0 & 
           fhd_count > 0 & 
           pai_count > 0)

# # Replace NA with 0.
# training_Vars <- training_Vars %>% replace(is.na(.), 0)

# Calculate the coverage ratios of several variables.
training_Vars <- training_Vars |> 
  mutate(
    # Forest land cover.
    Deci_F_ratio = Deci_F_count / EI_30m_count,
    Ever_F_ratio = Ever_F_count / EI_30m_count,
    Mix_F_ratio = Mix_F_count / EI_30m_count,
    
    # GEDI.
    rh98_ratio = rh98_count / EI_25m_count,
    cover_ratio = cover_count / EI_25m_count,
    fhd_ratio = fhd_count / EI_25m_count,
    pai_ratio = pai_count / EI_25m_count
  )

# Remove the "count" variables.
training_Vars <- training_Vars |> 
  select(-ends_with("_count"))

summary(training_Vars)
nrow(training_Vars)


# 3) Test dataset loading -------------------------------------------------

# Read the sampled environmental variables of the test dataset.
testVars_sf <- st_read(
  dsn = file.path("Results", "sampledVars_CircularBuffers",
                  "Buf_Test_AllVars_SSd",
                  "Buf_Test_AllVars_SSd.shp"),
  stringsAsFactors = TRUE)

glimpse(testVars_sf)

testVars_sf |> 
  select(scntfc_) |> 
  summary()

# Convert the sf object to a regular data frame.
testVars_df <- testVars_sf |> 
  st_drop_geometry()

# Select only the columns to be used in the model.
test_Vars <- testVars_df |> 
  select(
    ## eBird columns.
    scntfc_, spcs_bs,
    year, 
    # dy_f_yr, hrs_f_d,
    # effrt_h, effrt_d_, effrt_s_,
    # nmbr_bs,
    
    ## Environmental variables.
    # NDVI.
    starts_with("ND_"),
    
    # Topography.
    starts_with("elv_"),
    starts_with("slp_"),
    starts_with("asp_"),
    
    # Forest land cover.
    starts_with("Df_"),
    starts_with("Ef_"),
    starts_with("Mf_"),
    
    # GEDI.
    starts_with("rh98_"),
    starts_with("cover_"),
    starts_with("fhd_"),
    starts_with("pai_"),
    
    # Empty images.
    starts_with("empty_"), # 30-m resolution.
    starts_with("emp_25m_") # 25-m resolution.
  )

# Rename the selected columns.
colnames(test_Vars) <- c(
  "scientific_Name", "species_Observed", 
  "year", 
  # "D_of_Y", "H_of_D",
  # "ef_Hours", "ef_Dist", "ef_Speed", 
  # "num_Obsr",
  
  "NDVI_mean", "NDVI_count", "NDVI_SD", 
  
  "elv_mean", "elv_count", "elv_SD", 
  "slope_mean", "slope_count", "slope_SD", 
  "aspect_SD", "aspect_count", "aspect_mean", 
  
  "Deci_F_SD", "Deci_F_mean", "Deci_F_count", 
  "Ever_F_mean", "Ever_F_count", "Ever_F_SD", 
  "Mix_F_mean", "Mix_F_count", "Mix_F_SD", 
  
  "rh98_SD", "rh98_mean", "rh98_count", 
  "cover_SD", "cover_count", "cover_mean", 
  "fhd_count", "fhd_SD", "fhd_mean", 
  "pai_SD", "pai_mean", "pai_count", 
  
  "EI_30m_mean", "EI_30m_count", "EI_30m_SD", # Empty Images.
  "EI_25m_SD", "EI_25m_count", "EI_25m_mean"
)

# Further select the variables to use for modeling.
test_Vars <- test_Vars |> 
  select(
    scientific_Name, species_Observed, year,
    
    NDVI_mean, NDVI_SD,
    
    elv_mean, elv_SD,
    slope_mean, slope_SD,
    aspect_mean, aspect_SD,
    
    Deci_F_count, Ever_F_count, Mix_F_count,
    
    rh98_mean, rh98_SD, rh98_count,
    cover_mean, cover_SD, cover_count,
    fhd_mean, fhd_SD, fhd_count,
    pai_mean, pai_SD, pai_count,
    
    EI_30m_count, EI_25m_count
  )

head(test_Vars)

# Keep observations with all the GEDI variables.
test_Vars <- test_Vars |> 
  filter(rh98_count > 0 & 
           cover_count > 0 & 
           fhd_count > 0 & 
           pai_count > 0)

# # Replace NA with 0.
# test_Vars <- test_Vars %>% replace(is.na(.), 0)

# Calculate the coverage ratios of several variables.
test_Vars <- test_Vars |> 
  mutate(
    # Forest land cover.
    Deci_F_ratio = Deci_F_count / EI_30m_count,
    Ever_F_ratio = Ever_F_count / EI_30m_count,
    Mix_F_ratio = Mix_F_count / EI_30m_count,
    
    # GEDI.
    rh98_ratio = rh98_count / EI_25m_count,
    cover_ratio = cover_count / EI_25m_count,
    fhd_ratio = fhd_count / EI_25m_count,
    pai_ratio = pai_count / EI_25m_count
  )

# Remove the "count" variables.
test_Vars <- test_Vars |> 
  select(-ends_with("_count"))

summary(test_Vars)
nrow(test_Vars)

# Create a correlation matrix of all observations.
sampledVars_AllObs <- 
  training_Vars |> 
  bind_rows(test_Vars) |> 
  select(-scientific_Name)

cor_matrix_AllObs <- sampledVars_AllObs |> 
  select(-c(rh98_ratio, cover_ratio, fhd_ratio, pai_ratio)) |> 
  cor()

melted_cor_matrix_AllObs <- melt(cor_matrix_AllObs)

cor_matrix_Plot_AllObs <- ggplot(melted_cor_matrix_AllObs, 
                          aes(Var1, Var2, fill = value)) +
  geom_tile() +
  scale_fill_viridis_c(option = "viridis",
                       name = "Pearson\nCorrelation",
                       breaks = c(-0.2, 0.2, 0.6, 1)) +
  theme_minimal() +
  theme(axis.text.x = element_text(angle = 45, hjust = 1)) +
  labs(x = NULL, y = NULL,
       title = "All Observations") +
  theme(
    legend.position = "bottom",
    legend.text = element_text(size = 6),
    legend.title = element_text(size = 8, face = "bold"),
    axis.text = element_text(size = 6))

# Create a correlation matrix of buffers with >= 1% GEDI.
ratio_Thres <- 0.01

sampledVars_Filtered <- sampledVars_AllObs |> 
  filter(rh98_ratio >= ratio_Thres & 
           cover_ratio >= ratio_Thres & 
           fhd_ratio >= ratio_Thres & 
           pai_ratio >= ratio_Thres)

summary(sampledVars_Filtered)

cor_matrix_Filtered <- sampledVars_Filtered |> 
  select(-c(rh98_ratio, cover_ratio, fhd_ratio, pai_ratio)) |> 
  cor()

melted_cor_matrix_Filtered <- melt(cor_matrix_Filtered)

cor_matrix_Plot_Filtered <- ggplot(melted_cor_matrix_Filtered, 
                          aes(Var1, Var2, fill = value)) +
  geom_tile() +
  scale_fill_viridis_c(option = "viridis",
                       name = "Pearson\nCorrelation",
                       breaks = c(-0.2, 0.2, 0.6, 1)) +
  theme_minimal() +
  theme(axis.text.x = element_text(angle = 45, hjust = 1)) +
  labs(x = NULL, y = NULL,
       title = "Filtered Observations") +
  theme(
    legend.position = "bottom",
    legend.text = element_text(size = 6),
    legend.title = element_text(size = 8, face = "bold"),
    axis.text = element_text(size = 6))

if (!dir.exists("Results/Figures/Circular_Buffers")) {
  dir.create("Results/Figures/Circular_Buffers")
}

png(filename = "Results/Figures/Circular_Buffers/cor_matrix_Plots.png", 
    width = 4000, height = 2400, 
    units = "px", res = 400)
grid.arrange(cor_matrix_Plot_AllObs, cor_matrix_Plot_Filtered, 
             nrow = 1)
dev.off()

# Compare the datasets.
nrow(sampledVars_AllObs) # 18161.
nrow(sampledVars_Filtered) # 9466.


# 4) Random forest modeling -----------------------------------------------

# Filter the observations.
trainingVars_Filtered <- training_Vars |> 
  filter(rh98_ratio >= ratio_Thres & 
           cover_ratio >= ratio_Thres & 
           fhd_ratio >= ratio_Thres & 
           pai_ratio >= ratio_Thres)

testVars_Filtered <- test_Vars |> 
  filter(rh98_ratio >= ratio_Thres & 
           cover_ratio >= ratio_Thres & 
           fhd_ratio >= ratio_Thres & 
           pai_ratio >= ratio_Thres)

trainingVars_Filtered |> 
  select(ends_with("_ratio")) |> 
  summary()

# Determine the species names.
trainingVars_Filtered |> distinct(scientific_Name)

species_List <- c(
  "Certhia americana", 
  "Setophaga occidentalis",
  "Sitta carolinensis",
  "Junco hyemalis",
  "Regulus satrapa"
)

# Perform the modeling process by species.
calibration_curve_AllSpecies <- NULL
ppms_AllSpecies <- NULL
pi_AllSpecies <- NULL
pd_AllSpecies <- NULL

for (speciesName in species_List) {
  
  # Derive the training dataset of each species.
  trainingVars_OneSpecies <- trainingVars_Filtered |> 
    filter(scientific_Name == speciesName)
  
  # Derive the test dataset of each species.
  testVars_OneSpecies <- testVars_Filtered |> 
    filter(scientific_Name == speciesName)
  
  # Calculate the proportion of detections in the dataset.
  detection_freq <- mean(trainingVars_OneSpecies$species_Observed)
  
  # Fit a balanced random forest.
  # ranger requires a factor response to do classification
  er_model <- ranger(formula =  as.factor(species_Observed) ~ ., 
                     data = trainingVars_OneSpecies,
                     importance = "impurity",
                     probability = TRUE,
                     replace = TRUE, 
                     sample.fraction = c(detection_freq, detection_freq))
  
  ## Calibration.
  # Predicted encounter rate based on out of bag samples.
  er_pred <- er_model$predictions[, 2]
  
  # Observed detection, converted back from factor.
  det_obs <- as.integer(trainingVars_OneSpecies$species_Observed)
  
  # Construct a data frame.
  obs_pred <- data.frame(obs = det_obs, pred = er_pred)
  
  # train calibration model
  calibration_model <- scam(obs ~ s(pred, k = 6, bs = "mpi"), 
                            gamma = 2,
                            data = obs_pred)
  
  # Group the predicted encounter rate into bins of width 0.02,
  #   then calculate the mean observed encounter rates in each bin.
  er_breaks <- seq(0, 1, by = 0.02)
  
  mean_er <- obs_pred |>
    mutate(er_bin = cut(pred, breaks = er_breaks, include.lowest = TRUE)) |>
    group_by(er_bin) |>
    summarise(n_checklists = n(),
              pred = mean(pred), 
              obs = mean(obs),
              .groups = "drop")
  
  # Make predictions from the calibration model.
  calibration_curve_OneSpecies <- data.frame(pred = er_breaks)
  
  cal_pred <- predict(calibration_model, 
                      calibration_curve_OneSpecies, 
                      type = "response")
  
  calibration_curve_OneSpecies$calibrated <- cal_pred
  
  calibration_curve_OneSpecies$scientific_Name <- speciesName
  
  calibration_curve_AllSpecies <- calibration_curve_OneSpecies |> 
    bind_rows(calibration_curve_AllSpecies)
  
  
  ## Thresholding.
  # MCC and F1-Score calculation for various thresholds.
  mcc_f1 <- mccf1(
    # Observed detection/non-detection.
    response = obs_pred$obs,
    # Predicted encounter rate from random forest.
    predictor = obs_pred$pred)
  
  # Identify the best threshold using the MCC-F1 curve.
  mcc_f1_summary <- summary(mcc_f1)
  
  threshold <- mcc_f1_summary$best_threshold[1]
  
  
  ## Assessment.
  # Get the test dataset.
  testVars_OneSpecies <- testVars_OneSpecies |> 
    mutate(species_Observed = as.integer(species_Observed))
  
  # Predict to test data using random forest model.
  pred_er <- predict(er_model, data = testVars_OneSpecies, 
                     type = "response")
  
  # Extract probability of detection.
  pred_er <- pred_er$predictions[, 2]
  
  # Convert predictions to binary (presence/absence)
  #   using the identified threshold.
  pred_binary <- as.integer(pred_er > threshold)
  
  # Calibrate.
  pred_calibrated <- predict(calibration_model, 
                             newdata = data.frame(pred = pred_er), 
                             type = "response") |> 
    as.numeric()
  
  # Constrain probabilities to 0-1.
  pred_calibrated[pred_calibrated < 0] <- 0
  pred_calibrated[pred_calibrated > 1] <- 1
  
  # Combine observations and estimates.
  obs_pred_test <- data.frame(
    id = seq_along(pred_calibrated),
    
    # Actual detection/non-detection.
    obs = as.integer(testVars_OneSpecies$species_Observed),
    
    # Binary detection/on-detection prediction.
    pred_binary = pred_binary,
    
    # Calibrated encounter rate.
    pred_calibrated = pred_calibrated
  )
  
  # Mean squared error (mse).
  mse <- mean((obs_pred_test$obs - obs_pred_test$pred_calibrated) ^ 2, 
              na.rm = TRUE)
  
  # Precision-recall AUC.
  #   (Neither precision nor recall incorporate the true negative rate.)
  em <- precrec::evalmod(
    scores = obs_pred_test$pred_binary, 
    labels = obs_pred_test$obs
  )
  
  pr_auc <- precrec::auc(em) |> 
    filter(curvetypes == "PRC") |> 
    pull(aucs)
  
  # Calculate metrics for binary prediction: 
  #   sensitivity, specificity.
  pa_metrics <- obs_pred_test |> 
    select(id, obs, pred_binary) |> 
    PresenceAbsence::presence.absence.accuracy(
      na.rm = TRUE, st.dev = FALSE)
  
  # MCC and F1-Score.
  mcc_f1 <- calculate_mcc_f1(
    obs_pred_test$obs,
    obs_pred_test$pred_binary)
  
  # Combine predictive performance metrics (PPMs) together.
  ppms_OneSpecies <- data.frame(
    scientific_Name = speciesName,
    threshold = threshold,
    detection_freq = detection_freq,
    mse = mse,
    sensitivity = pa_metrics$sensitivity,
    specificity = pa_metrics$specificity,
    pr_auc = pr_auc,
    mcc = mcc_f1$mcc,
    f1 = mcc_f1$f1
  )
  
  ppms_AllSpecies <- ppms_OneSpecies |> 
    bind_rows(ppms_AllSpecies)
  
  
  ## Predictor importance.
  # Extract predictor importance from the random forest model object.
  pi <- er_model$variable.importance
  
  pi_OneSpecies <- data.frame(
    scientific_Name = speciesName,
    predictor = names(pi), 
    importance = pi
  ) |> 
    arrange(desc(importance))
  
  pi_AllSpecies <- pi_OneSpecies |> 
    bind_rows(pi_AllSpecies)
  
  
  ## Partial dependence.
  # Function to calculate partial dependence for a single predictor.
  calculate_pd <- function(predictor, er_model, calibration_model,
                           data, x_res = 25, n = 1000) {
    
    # predictor: the name of the predictor to calculate partial dependence for
    # er_model: the encounter rate model object
    # calibartion_model: the calibration model object
    # data: the original data used to train the model
    # x_res: the resolution of the grid over which to calculate the partial dependence, i.e. the number of points between the minimum and maximum values of the predictor to evaluate partial dependence at
    # n: number of points to subsample from the training data
    
    # Create prediction grid using quantiles.
    x_grid <- quantile(data[[predictor]],
                       probs = seq(from = 0, to = 1, length = x_res),
                       na.rm = TRUE)
    
    # Remove duplicates.
    x_grid <- x_grid[!duplicated(signif(x_grid, 8))]
    x_grid <- unname(unique(x_grid))
    grid <- data.frame(predictor = predictor, x = x_grid)
    names(grid) <- c("predictor", predictor)
    
    # Subsample training data.
    n <- min(n, nrow(data))
    data <- data[sample(seq.int(nrow(data)), size = n, replace = FALSE), ]
    
    # Drop focal predictor from data.
    data <- data[names(data) != predictor]
    grid <- merge(grid, data, all = TRUE)
    
    # Predict encounter rate.
    p <- predict(er_model, data = grid)
    
    # Summarize.
    pd <- grid[, c("predictor", predictor)]
    names(pd) <- c("predictor", "x")
    pd$encounter_rate <- p$predictions[, 2]
    pd <- dplyr::group_by(pd, predictor, x)
    pd <- dplyr::summarise(
      pd,
      encounter_rate = mean(encounter_rate, na.rm = TRUE),
      .groups = "drop")
    
    # Calibrate.
    pd$encounter_rate <- predict(
      calibration_model,
      newdata = data.frame(pred = pd$encounter_rate),
      type = "response"
    )
    
    pd$encounter_rate <- as.numeric(pd$encounter_rate)
    
    # Constrain to 0-1.
    pd$encounter_rate[pd$encounter_rate < 0] <- 0
    pd$encounter_rate[pd$encounter_rate > 1] <- 1
    
    return(pd)
  }
  
  # Calculate partial dependence for each of the top 20 predictors.
  pd_OneSpecies <- NULL
  
  for (predictor in head(pi_OneSpecies$predictor, 20)) {
    pd_OneSpecies <- calculate_pd(
      predictor,
      er_model = er_model,
      calibration_model = calibration_model,
      data = trainingVars_OneSpecies
    ) |> 
      bind_rows(pd_OneSpecies)
  }
  
  pd_OneSpecies$scientific_Name <- speciesName
  
  pd_AllSpecies <- pd_OneSpecies |> 
    bind_rows(pd_AllSpecies)
  
  # Check the species name.
  print(speciesName)
}


# 5) Result comparison ----------------------------------------------------

# Predictive performance metrics (PPMs).
ppms_AllSpecies

# Compared binned mean encounter rates to calibration model.
calibrationCurve_BySpecies <- ggplot(calibration_curve_AllSpecies) +
  aes(x = pred, y = calibrated) +
  geom_abline(slope = 1, intercept = 0, linetype = "dashed") +
  geom_line(aes(color = scientific_Name)) +
  geom_point(data = mean_er, 
             aes(x = pred, y = obs),
             size = 2, alpha = 0.6,
             show.legend = FALSE) +
  facet_wrap(~ scientific_Name,
             nrow = 1) +
  labs(x = "Estimated encounter rate",
       y = "Observed encounter rate",
       title = "Calibration Model") +
  coord_equal(xlim = c(0, 1), ylim = c(0, 1)) +
  theme(
    plot.title = element_text(hjust = 0.5, face = "bold"),
    plot.subtitle = element_text(hjust = 0.5),
    legend.position = "none",
    axis.text = element_text(size = 6)
  )

png(filename = "Results/Figures/Circular_Buffers/calibrationCurve_BySpecies.png", 
    width = 2000, height = 1000, 
    units = "px", res = 200)
calibrationCurve_BySpecies
dev.off()

# Plot importance of all predictors for each species.
pi_AllSpecies_Plot <- ggplot(pi_AllSpecies) + 
  aes(x = reorder(predictor, importance), y = importance) +
  geom_col() +
  geom_hline(yintercept = 0, linewidth = 2, colour = "#555555") +
  scale_y_continuous(expand = c(0, 0)) +
  coord_flip() +
  facet_wrap(~ scientific_Name, nrow = 1, scales = "free_x") +
  labs(x = NULL,
       y = "Predictor Importance (Gini Index)") +
  theme_minimal() +
  theme(panel.grid = element_blank(),
        panel.grid.major.x = element_line(colour = "#cccccc", linewidth = 0.5),
        axis.title.x = element_text(face = "bold"),
        axis.text = element_text(size = 6))

png(filename = "Results/Figures/Circular_Buffers/pi_AllSpecies_Plot.png", 
    width = 2000, height = 1000, 
    units = "px", res = 200)
pi_AllSpecies_Plot
dev.off()

# Plot partial dependence.
pd_AllSpecies_Plot <- ggplot(filter(pd_AllSpecies, predictor %in% head(pi_OneSpecies$predictor, 10))) +
  aes(x = x, y = encounter_rate, color = scientific_Name) +
  geom_line(linewidth = 2, alpha = 0.8) +
  # geom_point() +
  facet_wrap(~ factor(predictor, levels = rev(unique(predictor))), 
             nrow = 2, scales = "free_x") +
  labs(x = NULL, 
       y = "Encounter Rate", 
       title = "Partial Dependence", 
       color = "Scientific Name") +
  theme(
    plot.title = element_text(hjust = 0.5, face = "bold"),
    legend.position = "bottom",
    axis.text = element_text(size = 6))

png(filename = "Results/Figures/Circular_Buffers/pd_AllSpecies_Plot.png", 
    width = 2500, height = 2000, 
    units = "px", res = 200)
pd_AllSpecies_Plot
dev.off()

