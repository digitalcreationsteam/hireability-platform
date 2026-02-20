// src/scripts/initUniversities.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const path = require('path');
const University = require('../models/universityModel');
const axios = require('axios');

// Add delay function to avoid rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Attempt ${i + 1} of ${retries}...`);
            const response = await axios.get(url, {
                timeout: 30000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; UniversityBot/1.0)'
                }
            });
            return response;
        } catch (error) {
            console.log(`Attempt ${i + 1} failed:`, error.message);
            if (i === retries - 1) throw error;
            console.log(`Waiting ${(i + 1) * 2} seconds before retry...`);
            await delay((i + 1) * 2000); // Wait 2s, 4s, 6s...
        }
    }
}

async function initUniversities() {
    console.log('🚀 Starting university initialization...');
    console.log('Current directory:', __dirname);
    console.log('MONGO_URI:', process.env.MONGO_URI);

    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env file');
        }

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB');

        // Clear existing universities (optional)
        const deleteResult = await University.deleteMany({});
        console.log(`✅ Cleared ${deleteResult.deletedCount} existing universities`);

        // Method 1: Try with search parameters to get smaller chunks
        console.log('🌍 Fetching universities in batches by country...');

        // List of major countries to fetch
        const countries = [
            'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
            'Germany', 'France', 'Japan', 'China', 'Brazil', 'South Africa',
            'Russia', 'Italy', 'Spain', 'Netherlands', 'Sweden', 'Switzerland',
            'Singapore', 'South Korea', 'New Zealand', 'Ireland', 'Belgium',
            'Austria', 'Denmark', 'Finland', 'Norway', 'Poland', 'Portugal',
            'Greece', 'Czech Republic', 'Hungary', 'Mexico', 'Argentina',
            'Chile', 'Colombia', 'Malaysia', 'Thailand', 'Vietnam',
            'Indonesia', 'Philippines', 'Pakistan', 'Bangladesh', 'Sri Lanka',
            'Nepal', 'Kenya', 'Nigeria', 'Egypt', 'Saudi Arabia', 'UAE'
        ];

        let totalProcessed = 0;

        for (const country of countries) {
            try {
                console.log(`\n📌 Fetching universities for ${country}...`);

                const response = await fetchWithRetry(
                    `http://universities.hipolabs.com/search?country=${encodeURIComponent(country)}`
                );

                if (!response.data || !Array.isArray(response.data)) {
                    console.log(`No data for ${country}`);
                    continue;
                }

                console.log(`Found ${response.data.length} universities in ${country}`);

                // Process universities for this country
                for (const uni of response.data) {
                    const normalizedName = uni.name
                        .toLowerCase()
                        .trim()
                        .replace(/[^\w\s]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();

                    await University.findOneAndUpdate(
                        { normalizedName },
                        {
                            $set: {
                                name: uni.name,
                                normalizedName,
                                country: uni.country,
                                countryCode: uni.alpha_two_code,
                                alphaTwoCode: uni.alpha_two_code,
                                stateProvince: uni['state-province'],
                                domains: uni.domains || [],
                                webPages: uni.web_pages || []
                            }
                        },
                        { upsert: true }
                    );

                    totalProcessed++;
                }

                // Delay between countries to avoid rate limiting
                await delay(1000);

            } catch (error) {
                console.error(`Error fetching ${country}:`, error.message);
                continue; // Continue with next country
            }
        }

        // Method 2: If country-wise fails, try with name search for major universities
        console.log('\n📌 Fetching major universities by name...');

        const majorUniversities = [
            'Harvard', 'MIT', 'Stanford', 'Oxford', 'Cambridge',
            'IIT Bombay', 'IIT Delhi', 'Delhi University', 'Mumbai University',
            'Tokyo University', 'Seoul National University', 'Peking University'
        ];

        for (const uniName of majorUniversities) {
            try {
                const response = await fetchWithRetry(
                    `http://universities.hipolabs.com/search?name=${encodeURIComponent(uniName)}`
                );

                if (response.data && Array.isArray(response.data)) {
                    for (const uni of response.data) {
                        const normalizedName = uni.name
                            .toLowerCase()
                            .trim()
                            .replace(/[^\w\s]/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();

                        await University.findOneAndUpdate(
                            { normalizedName },
                            {
                                $set: {
                                    name: uni.name,
                                    normalizedName,
                                    country: uni.country,
                                    countryCode: uni.alpha_two_code,
                                    alphaTwoCode: uni.alpha_two_code,
                                    stateProvince: uni['state-province'],
                                    domains: uni.domains || [],
                                    webPages: uni.web_pages || []
                                }
                            },
                            { upsert: true }
                        );
                    }
                }

                await delay(500);

            } catch (error) {
                console.error(`Error fetching ${uniName}:`, error.message);
            }
        }

        const total = await University.countDocuments();
        console.log(`\n🎉 Success! Total universities in database: ${total}`);

        // Show sample
        const sample = await University.find().limit(5);
        console.log('\n📚 Sample universities:');
        sample.forEach((u, i) => {
            console.log(`${i + 1}. ${u.name} (${u.country})`);
        });

        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal Error:', error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

initUniversities();