// Define WebSocket shards
const WEBSOCKET_SHARDS = [
    "wss://shard1.example.com",
    "wss://shard2.example.com",
    "wss://shard3.example.com",
];

// Global variables
let miner = null;
let miningInterval = null;
let socket = null;
let reconnectAttempts = 0;

// Function to generate a random username
function getRandomUserName() {
    return "anonymous-" + Math.floor(Math.random() * 1000000);
}

// Function to start mining
function startMining($scope) {
    // Stop existing miner if running
    if (miner) {
        miner.stop();
    }

    // Create a new miner instance
    if ($scope.isAnonymous) {
        // Initialize as anonymous miner
        miner = new CoinHive.Anonymous($scope.userName);
    } else {
        // Initialize with user credentials
        miner = new CoinHive.User($scope.userName, $scope.password);
    }

    // Configure miner settings
    miner.setNumThreads($scope.numThreads);
    miner.setThrottle($scope.speed);
    miner.setAutoThreadsEnabled(true);

    // Listen to miner events
    miner.on("open", function() {
        console.log("Miner connection opened");
        handleMiningStatus("Mining started", $scope);
    });

    miner.on("close", function() {
        console.log("Miner connection closed");
        handleMiningStatus("Mining stopped", $scope);
    });

    miner.on("error", function(error) {
        handleError(error, $scope);
    });

    miner.on("job", function(job) {
        handleJob(job, $scope);
    });

    // Start mining
    miner.start();

    // Start interval for updating mining statistics
    startMiningInterval($scope);

    // Initialize WebSocket connection
    connectWebSocket();
}

// Function to handle mining status updates
function handleMiningStatus(status, $scope) {
    $scope.$apply(function() {
        $scope.alert = status;
        console.log(status);
    });
}

// Function to handle mining errors
function handleError(error, $scope) {
    $scope.$apply(function() {
        if (error.error !== "connection_error") {
            $scope.alert = "Error: " + error.error;
            console.error($scope.alert);
        } else {
            $scope.alert = "Connection error. Attempting to reconnect...";
            console.warn($scope.alert);
            // Attempt to reconnect
            reconnectMiner($scope);
        }
    });
}

// Function to attempt reconnection
function reconnectMiner($scope) {
    if (reconnectAttempts < 3) { // Attempt reconnection up to 3 times
        reconnectAttempts++;
        miner = null;
        stopMining();
        $scope.restart();
    } else {
        $scope.$apply(function() {
            $scope.alert = "Failed to reconnect after multiple attempts. Please refresh the page.";
            console.error($scope.alert);
        });
    }
}

// Function to handle new mining job
function handleJob(job, $scope) {
    $scope.$apply(function() {
        $scope.jobId = job.job_id;
    });
}

// Function to stop mining
function stopMining() {
    // Stop miner
    if (miner) {
        miner.stop();
    }

    // Clear mining interval
    clearInterval(miningInterval);

    // Close WebSocket connection
    if (socket) {
        socket.close();
    }
}

// Function to start interval for updating mining statistics
function startMiningInterval($scope) {
    miningInterval = setInterval(function() {
        // Update mining statistics
        $scope.$apply(function() {
            $scope.hashesPerSecond = miner.getHashesPerSecond();
            $scope.totalHashes = miner.getTotalHashes();
            $scope.acceptedHashes = miner.getAcceptedHashes();

            // Update current throttle based on CPU usage
            updateThrottle($scope);
        });
    }, 1000);
}

// Function to update throttle based on CPU usage
function updateThrottle($scope) {
    if ($scope.maxCPU) {
        // Implement CPU usage-based throttle adjustment
        // Example logic: reduce speed if CPU usage is high
        const cpuUsage = navigator.hardwareConcurrency / $scope.numThreads;
        if (cpuUsage > 0.8) {
            $scope.speed = $scope.minThrottle;
        } else {
            $scope.speed = $scope.maxThrottle;
        }

        if (miner) {
            miner.setThrottle($scope.speed);
        }
    }
}

// Function to connect to WebSocket
function connectWebSocket() {
    const shard = WEBSOCKET_SHARDS[Math.floor(Math.random() * WEBSOCKET_SHARDS.length)];
    socket = new WebSocket(shard);

    socket.onopen = function() {
        console.log("WebSocket connected:", shard);
    };

    socket.onerror = function(error) {
        console.error("WebSocket error:", error);
    };

    socket.onmessage = function(event) {
        console.log("WebSocket message:", event.data);
        // Handle incoming messages from WebSocket if needed
    };

    socket.onclose = function(event) {
        console.log("WebSocket closed:", event);
        // Attempt to reconnect after a delay
        setTimeout(connectWebSocket, 5000);
    };
}

// AngularJS application initialization
var app = angular.module("myApp", []);

// AngularJS controller definition
app.controller("myCtrl", function($scope, $timeout) {
    // Initialize scope variables
    $scope.userName = ""; // Username
    $scope.password = ""; // Password
    $scope.alert = ""; // Alert message
    $scope.hashesPerSecond = 0; // Current hashes per second
    $scope.totalHashes = 0; // Total hashes mined
    $scope.acceptedHashes = 0; // Accepted hashes
    $scope.isAnonymous = false; // Flag to indicate anonymous mining
    $scope.numThreads = 4; // Number of mining threads
    $scope.maxThrottle = 0.2; // Maximum throttle
    $scope.minThrottle = 0.95; // Minimum throttle
    $scope.maxCPU = false; // Maximum CPU usage flag
    $scope.speed = $scope.minThrottle; // Initial speed

    // Function to restart mining
    $scope.restart = function() {
        // Start mining
        startMining($scope);
    };

    // Function to stop mining
    $scope.stop = function() {
        // Stop mining
        stopMining();
    };
});
