function readJsonFile(filePath) {
    $.writeln("Entering readJsonFile function");

    // Polyfill for JSON.parse in environments where JSON is not defined
    if (typeof JSON === "undefined") {
        JSON = {
            parse: function(jsonString) {
                // A simple way to parse JSON from a string; use with caution as it uses eval
                return eval("(" + jsonString + ")");
            },
            stringify: function(obj) {
                // Implement a simple stringify if necessary
                // This is a very basic implementation and might not work for all objects
                var str = [];
                for (var p in obj)
                    if (obj.hasOwnProperty(p)) {
                        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                    }
                return "{" + str.join(",") + "}";
            }
        };
    }

    var file = new File(filePath);
    if (!file.exists) {
        alert("File not found: " + filePath);
        return null;
    }
    file.open("r");
    var json = file.read();
    file.close();
    $.writeln("JSON read from file: " + json); // Debugging message
    return JSON.parse(json);
}

// Path to your JSON file
var jsonFilePath = "F:\\-playlist-youtube-mix\\AE-MIX-CREATOR-GENERAL\\AE-MIX-CREATOR.01\\config.json"; // Update this to your actual file path
var config = readJsonFile(jsonFilePath);
$.writeln("Config object: " + JSON.stringify(config)); // Debugging message

(function() {
    // Check if After Effects is running
    if (app.project === null) {
        alert("Please run Adobe After Effects");
        return;
    }
    $.writeln("Adobe After Effects is running");

    function createFolders() {
        $.writeln("Entering createFolders function");

        var folders = {
            mediaInputFolderItem: app.project.items.addFolder("MEDIA-INPUT"),
            logoBeforeFolderItem: app.project.items.addFolder("LOGO-BEFORE"),
            layerFxFolderItem: app.project.items.addFolder("LAYER-FX")
        };
        return folders;
    }

    if (!config) {
        alert("Failed to read or parse the config file.");
        return; // Stop script execution if config is not available
    }

    // Define main composition settings
    var compWidth = config.finalResolution.width;
    var compHeight = config.finalResolution.height;
    var compFPS = config.compFPS;
    var fadeOutDuration = config.fadeOutDuration;
    var logoBeforeDuration = config.logoBeforeDuration;

    function importAndOrganizeMedia(mediaInputFolderItem) {
        $.writeln("Entering importAndOrganizeMedia function");
        var mediaInputFolderPath = "F:\\-playlist-youtube-mix\\AE-MIX-CREATOR-GENERAL\\AE-MIX-CREATOR.01\\MEDIA-INPUT";
        var mediaInputFolder = new Folder(mediaInputFolderPath);
        if (!mediaInputFolder.exists) {
            alert("MEDIA-INPUT folder not found.");
            return;
        }

        var totalAudioDuration = 0;

        function importFilesFromFolder(folder) {
            $.writeln("Entering importFilesFromFolder function");
            var files = folder.getFiles();
            for (var i = 0; i < files.length; i++) {
                if (files[i] instanceof File) {
                    // Import the file
                    var importOptions = new ImportOptions(files[i]);
                    var importedItem = app.project.importFile(importOptions);
                    importedItem.parentFolder = mediaInputFolderItem;

                    // Check for audio file
                    if (importedItem instanceof FootageItem && importedItem.name.match(/\.mp3$/i)) {
                        totalAudioDuration += importedItem.duration;
                    }
                } else if (files[i] instanceof Folder) {
                    // If it's a folder, search its contents recursively
                    importFilesFromFolder(files[i]);
                }
            }
        }

        // Start the import process
        importFilesFromFolder(mediaInputFolder);

        return {
            totalAudioDuration: totalAudioDuration
        };
    }

    function importVideo(folderPath, folderItem) {
        $.writeln("Entering importVideo function");

        var folder = new Folder(folderPath);
        var file = folder.getFiles(function(file) {
            return (file instanceof File && (file.name.match(/\.(mp4|mov)$/i)));
        })[0];
        if (!file) {
            alert("Video file not found in " + folderPath);
            return;
        }
        var importOptions = new ImportOptions(file);
        var importedVideo = app.project.importFile(importOptions);
        importedVideo.parentFolder = folderItem;
        return importedVideo;
    }

    function createCompositions(compWidth, compHeight, compFPS, totalAudioDuration) {
        $.writeln("Entering createCompositions function");
        return app.project.items.addComp("Video Mix", compWidth, compHeight, 1, totalAudioDuration, compFPS);
    }

    function addBackgroundPNG(mediaInputFolderItem, myComp, compWidth, compHeight) {
        $.writeln("Entering addBackgroundPNG function");
        var dataFolder = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            if (app.project.item(i) instanceof FolderItem && app.project.item(i).name === "Data") {
                dataFolder = app.project.item(i);
                break;
            }
        }
        if (!dataFolder) {
            dataFolder = app.project.items.addFolder("Data");
        }

        // Create 'Background' composition
        var bgComp = app.project.items.addComp("Background", compWidth, compHeight, 1, myComp.duration, compFPS);
        bgComp.parentFolder = dataFolder; // Move 'Background' composition to 'Data' folder

        // Add PNG to 'Background' composition
        var pngFile = null;
        for (var j = 1; j <= mediaInputFolderItem.items.length; j++) {
            $.writeln("Checking item " + j + " of " + mediaInputFolderItem.items.length);
            var currentItem = mediaInputFolderItem.items[j];
            if (currentItem instanceof FootageItem && /\.png$/i.test(currentItem.name)) {
                $.writeln("PNG file found: " + currentItem.name);
                pngFile = currentItem;
                break;
            }
        }  
        if (pngFile) {
            var backgroundLayer = bgComp.layers.add(pngFile);
            backgroundLayer.property("Transform").property("Scale").setValue([130, 130]);

            var startTime = 0; // Start of the composition
            var endTime = 4; // 4 seconds into the composition
            var scaleProperty = backgroundLayer.property("Transform").property("Scale");
            scaleProperty.setValueAtTime(startTime, [130, 130]);
            scaleProperty.setValueAtTime(endTime, [100, 100]);

            // Define KeyframeEase objects for ease-out effect
            // Since we want a smooth deceleration, we focus on ease-out parameters
            var easeIn = new KeyframeEase(0.5, 50);
            var easeOut = new KeyframeEase(0.5, 100); // Use appropriate speed and influence values

            // Correctly apply ease-out to both dimensions (X and Y) of the Scale property
            scaleProperty.setTemporalEaseAtKey(2, [easeIn, easeIn, easeIn], [easeOut, easeOut, easeOut]);// Apply to the end keyframe


            // Add Gaussian Blur effect
            var blurEffect = backgroundLayer.property("Effects").addProperty("ADBE Gaussian Blur 2");
            // Animate blur from 50 to 0
            blurEffect.property("Blurriness").setValueAtTime(startTime, 100);
            blurEffect.property("Blurriness").setValueAtTime(endTime, 0);

            // Animate opacity from 0% to 100%
            backgroundLayer.property("Transform").property("Opacity").setValueAtTime(startTime, 0);
            backgroundLayer.property("Transform").property("Opacity").setValueAtTime(endTime, 100);

            backgroundLayer.property("Transform").property("Position").setValue([compWidth / 2, compHeight / 2]);
            $.writeln("Position set");
            myComp.layers.add(bgComp);
            $.writeln("Background composition added to myComp");
        } else {
            alert("No PNG file found in MEDIA-INPUT folder.");
        }
    }

    
    function createAudioMixComposition(mediaInputFolderItem, compWidth, compHeight, compFPS, totalAudioDuration) {
        $.writeln("Entering createAudioMixComposition function");
        var audioComp = app.project.items.addComp("Audio Mix", compWidth, compHeight, 1, totalAudioDuration, compFPS);
        var accumulatedDuration = 0;
        for (var k = 1; k <= mediaInputFolderItem.items.length; k++) {
            var currentAudioItem = mediaInputFolderItem.items[k];
            if (currentAudioItem instanceof FootageItem && currentAudioItem.name.match(/\.mp3$/i)) {
                var audioLayer = audioComp.layers.add(currentAudioItem);
                audioLayer.startTime = accumulatedDuration;
                accumulatedDuration += currentAudioItem.duration;
            }
        }
        return audioComp;
    }

    function addLogoBeforeLayer(logoBeforeVideo, myComp) {
        $.writeln("Entering addLogoBeforeLayer function");
        var logoLayer = myComp.layers.add(logoBeforeVideo);

        // Set the out-point of the layer to the duration specified in the config
        logoLayer.outPoint = config.logoBeforeDuration;

        // Calculate the start time for the fade-out
        var fadeOutStartTime = config.logoBeforeDuration - config.fadeOutDuration;


        // Add keyframes for the fade-out
        logoLayer.opacity.setValueAtTime(fadeOutStartTime, 100); // Start of fade-out
        logoLayer.opacity.setValueAtTime(config.logoBeforeDuration, 0); // End of fade-out

        return logoLayer;
    }

    function addLayerFxLayer(layerFxVideo, myComp) {
        $.writeln("Entering addLayerFxLayer function");
        var layerFxLayer = myComp.layers.add(layerFxVideo);

        // Calculate the start time for the layer-fx layer based on the fadeout of the logo-before video
        var fadeOutStartTime = config.logoBeforeDuration - config.fadeOutDuration;

        // Set the start time of the layer-fx layer to the fadeout start time of the logo-before video
        layerFxLayer.startTime = fadeOutStartTime;
        layerFxLayer.transform.scale.setValue([100, 100]);
        layerFxLayer.blendingMode = BlendingMode.SCREEN;
        layerFxLayer.startTime = logoBeforeDuration;
        layerFxLayer.inPoint = logoBeforeDuration;
        layerFxLayer.timeRemapEnabled = true;
        layerFxLayer.property("Time Remap").setValueAtTime(logoBeforeDuration, 0);
        layerFxLayer.outPoint = myComp.duration;
        layerFxLayer.property("Time Remap").expression = "loopOut('cycle')";
        layerFxLayer.opacity.setValue(config.layerFxOpacity);
        var tintEffect = layerFxLayer.property("Effects").addProperty("ADBE Tint");
        // Assuming config.tintColor is a string like "#FF1F1F"
        var hexColor = config.tintColor;
        // Convert hexColor to RGB and then to normalized RGB
        var r = parseInt(hexColor.substring(1, 3), 16) / 255;
        var g = parseInt(hexColor.substring(3, 5), 16) / 255;
        var b = parseInt(hexColor.substring(5, 7), 16) / 255;
        tintEffect.property("Map White To").setValue([r, g, b, 1]);






    }

    function addLayerAddVideo(myComp, logoBeforeDuration) {
        $.writeln("Entering addLayerAddVideo function");
        var layerAddFolderPath = "F:\\-playlist-youtube-mix\\AE-MIX-CREATOR-GENERAL\\AE-MIX-CREATOR.01\\LAYER-ADD";
        var layerAddFolder = new Folder(layerAddFolderPath);
        var movFiles = layerAddFolder.getFiles("*.mov");

        if (movFiles.length === 0) {
            alert("No .mov file found in " + layerAddFolderPath);
            return;
        }

        var importOptions = new ImportOptions(movFiles[0]);
        var layerAddVideo = app.project.importFile(importOptions);
        var layerAddFolderItem = app.project.items.addFolder("LAYER-ADD");
        layerAddVideo.parentFolder = layerAddFolderItem;

        var layerAddLayer = myComp.layers.add(layerAddVideo);
        layerAddLayer.startTime = logoBeforeDuration;

        layerAddLayer.timeRemapEnabled = true;
        var videoDuration = layerAddVideo.duration;
        var pauseDuration = 10 * 60; // 10 minutes in seconds

        // Extend the out-point to cover the entire composition
        layerAddLayer.outPoint = myComp.duration;

        var cycleDuration = videoDuration + pauseDuration;

        // Revised time remapping expression
        layerAddLayer.timeRemap.expression = 
            "var videoDuration = " + videoDuration + ";\n" +
            "var pauseDuration = " + pauseDuration + ";\n" +
            "var cycleDuration = videoDuration + pauseDuration;\n" +
            "var timeSinceStart = time - inPoint;\n" +
            "var currentCycleTime = timeSinceStart % cycleDuration;\n" +
            "if (currentCycleTime < videoDuration) {\n" +
            "    currentCycleTime;\n" +
            "} else {\n" +
            "    0; // Hold on the first frame during the pause\n" +
            "}";
    }

    function addAudioLayers(mediaInputFolderItem, myComp) {
        $.writeln("Entering addAudioLayers function");
        var accumulatedDuration = 0;
        for (var k = 1; k <= mediaInputFolderItem.items.length; k++) {
            var currentAudioItem = mediaInputFolderItem.items[k];
            if (currentAudioItem instanceof FootageItem && currentAudioItem.name.match(/\.mp3$/i)) {
                var audioLayer = myComp.layers.add(currentAudioItem);
                audioLayer.startTime = accumulatedDuration;
                accumulatedDuration += currentAudioItem.duration;
            }
        }
    }

    function processAudioLayer(myComp) {
        $.writeln("Processing Audio Layer");
        myComp.openInViewer();

        var audioMixLayer = myComp.layer("Audio Mix");
        if (!audioMixLayer) {
            $.writeln("Audio Mix layer not found");
            alert("Audio Mix layer not found.");
            return;
        }

        audioMixLayer.selected = true;
        app.executeCommand(app.findMenuCommandId("Convert Audio to Keyframes"));
        audioMixLayer.selected = false;

        // Wait for 'Audio Amplitude' layer to be created
        var audioAmplitudeLayer = null;
        for (var i = 0; i < 30; i++) { // Attempt 30 times with a delay
            audioAmplitudeLayer = myComp.layers.byName("Audio Amplitude");
            if (audioAmplitudeLayer) break;
            $.sleep(100); // Delay 100 milliseconds
        }

        if (!audioAmplitudeLayer) {
            $.writeln("Audio Amplitude layer not found after waiting.");
            alert("Audio Amplitude layer not found. Please check the audio conversion.");
            return;
        }

        var minAudio = Number.MAX_VALUE;
        var maxAudio = Number.MIN_VALUE;
        var audioEffect = audioAmplitudeLayer.effect("Both Channels")("Slider");
        for (var i = 1; i <= audioEffect.numKeys; i++) {
            var amplitudeValue = audioEffect.keyValue(i);
            if (amplitudeValue < minAudio) minAudio = amplitudeValue;
            if (amplitudeValue > maxAudio) maxAudio = amplitudeValue;
        }

        $.writeln("Min Audio: " + minAudio + ", Max Audio: " + maxAudio);
    }

    function linkBackgroundToAudio(myComp, audioAmplitudeLayer, minAudio, maxAudio) {
        $.writeln("Linking Background to Audio");
        var bgLayer = myComp.layers.byName("Background"); 
        if (!bgLayer) {
            $.writeln("Background layer not found");
            alert("Background layer not found.");
            return;
        }

        var expression = "var audioLayer = thisComp.layer('" + audioAmplitudeLayer + "');\n" +
                        "var audio = audioLayer.effect('Both Channels')('Slider');\n" +
                        "linear(audio, 0, 70, 75, 100);"; // Map audio amplitude from 0-70 to opacity from 75%-100%

        bgLayer.opacity.expression = expression;
            $.writeln("Opacity expression set for Background layer");
    }

    function organizeAndSaveProject() {
        $.writeln("Entering organizeAndSaveProject function");

        // Ensure there is an open project
        if (app.project === null) {
            alert("No project open");
            return;
        }

        // Create 'Data' folder
        var dataFolder = app.project.items.addFolder("Data");

        // Move 'Background' and 'Audio Mix' compositions to 'Data' folder
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && (item.name === "Background" || item.name === "Audio Mix")) {
                item.parentFolder = dataFolder;
            }
        }


        // Save the project in the original working folder
        var saveFolderPath = "D:\\mix-to-export";
        var savedFileName = "OrganizedProject_" + new Date().getTime() + ".aep";
        var saveFilePath = new File(saveFolderPath + "\\" + savedFileName);

        app.project.save(saveFilePath);

        // Close the project without saving changes
        app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
    }

    



function exportTracklistToFile(audioComp, filePath) {
    $.writeln("Entering exportTracklistToFile function");

    var file = new File(filePath);
    if (!file.open("w")) { // Ensure the file is opened for writing.
        alert("Failed to open file for writing: " + filePath);
        return;
    }

    var trackList = [];

    // Iterate through the audioComp's layers in reverse.
    for (var i = audioComp.numLayers; i >= 1; i--) {
        var layer = audioComp.layer(i);
        if (layer.source instanceof FootageItem && /\.mp3$/i.test(layer.name)) {
            var startTime = layer.startTime; // Get the start time directly from the layer.
            var formattedStartTime = formatTime(startTime);

            // Prepare track info and add it to trackList array.
            var trackInfo = (audioComp.numLayers - i + 1) + ". " + layer.name + " - Start Time: " + formattedStartTime;
            trackList.push(trackInfo);
        }
    }

    // Join the track list with new line characters and write to file in one go.
    file.write(trackList.join("\n"));
    file.close();
    //alert("Tracklist exported to: " + filePath);
}


    // Utility function to format time in HH:MM:SS format
    function formatTime(time) {
        var hours = Math.floor(time / 3600);
        var minutes = Math.floor((time % 3600) / 60);
        var seconds = Math.floor(time % 60);

        // Manually format each component to add leading zeros if necessary
        var formattedHours = hours < 10 ? "0" + hours : hours.toString();
        var formattedMinutes = minutes < 10 ? "0" + minutes : minutes.toString();
        var formattedSeconds = seconds < 10 ? "0" + seconds : seconds.toString();

        return formattedHours + ":" + formattedMinutes + ":" + formattedSeconds;
    }







    // Main execution
    var folders = createFolders();
    var mediaData = importAndOrganizeMedia(folders.mediaInputFolderItem);
    var logoBeforeVideo = importVideo("F:\\-playlist-youtube-mix\\AE-MIX-CREATOR-GENERAL\\AE-MIX-CREATOR.01\\LOGO-BEFORE", folders.logoBeforeFolderItem);
    var layerFxVideo = importVideo("F:\\-playlist-youtube-mix\\AE-MIX-CREATOR-GENERAL\\AE-MIX-CREATOR.01\\LAYER-FX", folders.layerFxFolderItem);
    var myComp = createCompositions(compWidth, compHeight, compFPS, mediaData.totalAudioDuration);

    addBackgroundPNG(folders.mediaInputFolderItem, myComp, compWidth, compHeight);

    addLogoBeforeLayer(logoBeforeVideo, myComp);

    addLayerFxLayer(layerFxVideo, myComp, logoBeforeVideo.duration);

    addLayerAddVideo(myComp, config.logoBeforeDuration);

    var audioComp = createAudioMixComposition(folders.mediaInputFolderItem, compWidth, compHeight, compFPS, mediaData.totalAudioDuration);
    var audioMixLayer = myComp.layers.add(audioComp);
    audioMixLayer.moveToBeginning(); // Ensure the audio mix layer is at the top

    var exportFilePath = "F:\\-playlist-youtube-mix\\AE-MIX-CREATOR-GENERAL\\AE-MIX-CREATOR.01\\tracklist.txt";
    exportTracklistToFile(audioComp, exportFilePath);

    processAudioLayer(myComp);

    linkBackgroundToAudio(myComp, "Audio Amplitude"); // Add this line after processAudioLayer function call
    organizeAndSaveProject();
})();




 