// services/universitySyncService.js
const University = require("../models/universityModel");
const axios = require('axios');

class UniversitySyncService {
    constructor() {
        // Public APIs (no API key needed)
        this.apis = [
            {
                name: 'HipoLabs',
                url: 'http://universities.hipolabs.com/search',
                enabled: true,
                parser: (data) => data.map(u => ({
                    name: u.name,
                    country: u.country,
                    countryCode: u.alpha_two_code,
                    alphaTwoCode: u.alpha_two_code,
                    stateProvince: u['state-province'],
                    domains: u.domains || [],
                    webPages: u.web_pages || []
                }))
            },
            {
                name: 'OpenAlex',
                url: 'https://api.openalex.org/institutions',
                enabled: true,
                parser: (data) => data.results.map(u => ({
                    name: u.display_name,
                    country: u.country_code ? this.getCountryName(u.country_code) : null,
                    countryCode: u.country_code,
                    domains: u.domains || [],
                    webPages: u.homepage_url ? [u.homepage_url] : []
                }))
            },
            {
                name: 'World Academia',
                url: 'https://api.kelchotech.systems/universities',
                enabled: true,
                parser: (data) => data.map(u => ({
                    name: u.name,
                    country: u.country,
                    alphaTwoCode: u.alpha_two_code,
                    stateProvince: u.state_province,
                    webPages: u.web_pages || []
                }))
            }
        ];
    }

    getCountryName(code) {
        const countries = {
            'IN': 'India',
            'US': 'United States',
            'GB': 'United Kingdom',
            'CA': 'Canada',
            'AU': 'Australia',
            // Add more as needed
        };
        return countries[code] || code;
    }

    normalizeString(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\b(university|institute|college|of|the|and|&)\b/g, '')
            .trim();
    }

    async syncFromHipoLabs(country = null) {
        try {
            console.log(`[UniversitySync] Syncing from HipoLabs${country ? ` for ${country}` : ''}`);

            const url = country
                ? `${this.apis[0].url}?country=${encodeURIComponent(country)}`
                : this.apis[0].url;

            const response = await axios.get(url, { timeout: 10000 });

            if (!response.data || !Array.isArray(response.data)) {
                console.log('[UniversitySync] No data from HipoLabs');
                return 0;
            }

            let count = 0;
            for (const uni of response.data) {
                const normalizedName = this.normalizeString(uni.name);

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
                count++;
            }

            console.log(`[UniversitySync] Synced ${count} universities from HipoLabs`);
            return count;
        } catch (error) {
            console.error('[UniversitySync] Error syncing from HipoLabs:', error.message);
            return 0;
        }
    }

    async syncAll() {
        console.log('[UniversitySync] Starting full sync...');

        // Sync major countries
        const countries = [
            'India', 'United States', 'United Kingdom', 'Canada',
            'Australia', 'Germany', 'France', 'Japan', 'China'
        ];

        let total = 0;
        for (const country of countries) {
            total += await this.syncFromHipoLabs(country);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        }

        console.log(`[UniversitySync] Completed! Total: ${total} universities`);
        return total;
    }

    async searchUniversities(query, limit = 10) {
        try {
            const normalized = this.normalizeString(query);

            // Search in database first
            const results = await University.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { normalizedName: { $regex: normalized, $options: 'i' } }
                ]
            }).limit(limit);

            return results;
        } catch (error) {
            console.error('[UniversitySync] Search error:', error);
            return [];
        }
    }
}

module.exports = new UniversitySyncService();