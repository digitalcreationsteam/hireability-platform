// services/universityMatchingService.js
const University = require("../models/universityModel");
const universitySync = require("./universitySyncService");
const natural = require('natural'); // npm install natural

class UniversityMatchingService {
    constructor() {
        this.commonVariations = {
            // Indian Universities
            'iit bombay': ['iit bombay', 'indian institute of technology bombay', 'iitb', 'iit-mumbai'],
            'iit delhi': ['iit delhi', 'indian institute of technology delhi', 'iitd'],
            'savitribai phule pune university': ['sppu', 'pune university', 'university of pune'],
            'mumbai university': ['university of mumbai', 'mu', 'bombay university'],
            'delhi university': ['university of delhi', 'du'],

            // US Universities
            'massachusetts institute of technology': ['mit', 'massachusetts institute'],
            'stanford university': ['stanford', 'stanford uni'],
            'harvard university': ['harvard', 'harvard uni'],
            'university of california berkeley': ['uc berkeley', 'berkeley', 'cal'],

            // UK Universities
            'university of oxford': ['oxford', 'oxford university'],
            'university of cambridge': ['cambridge', 'cambridge university'],
            'imperial college london': ['imperial', 'imperial college'],

            // Add more as needed
        };

        this.tokenizer = new natural.WordTokenizer();
    }

    normalizeName(name) {
        if (!name) return '';
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    calculateSimilarity(str1, str2) {
        const s1 = this.normalizeName(str1);
        const s2 = this.normalizeName(str2);

        // Jaro-Winkler distance (good for short strings)
        const jaro = natural.JaroWinklerDistance(s1, s2);

        // Levenshtein distance based similarity
        const levenshtein = natural.LevenshteinDistance(s1, s2);
        const maxLength = Math.max(s1.length, s2.length);
        const levenshteinSim = maxLength === 0 ? 1 : 1 - (levenshtein / maxLength);

        return Math.max(jaro, levenshteinSim);
    }

    async findBestMatch(inputName) {
        try {
            if (!inputName) return null;

            const normalizedInput = this.normalizeName(inputName);

            // Step 1: Check variations map
            for (const [standard, variations] of Object.entries(this.commonVariations)) {
                for (const variation of variations) {
                    if (this.normalizeName(variation).includes(normalizedInput) ||
                        normalizedInput.includes(this.normalizeName(variation))) {
                        return {
                            matchedName: standard,
                            confidence: 0.95,
                            matchType: 'variation'
                        };
                    }
                }
            }

            // Step 2: Search in database
            const universities = await University.find().limit(1000);

            let bestMatch = {
                matchedName: inputName,
                confidence: 0,
                matchType: 'none'
            };

            for (const uni of universities) {
                const similarity = this.calculateSimilarity(inputName, uni.name);

                if (similarity > bestMatch.confidence) {
                    bestMatch = {
                        matchedName: uni.name,
                        confidence: similarity,
                        matchType: similarity > 0.85 ? 'database' : 'fuzzy'
                    };
                }

                if (similarity > 0.95) break;
            }

            // Step 3: If confidence is good, return match
            if (bestMatch.confidence > 0.7) {
                return bestMatch;
            }

            // Step 4: Try real-time API search as fallback
            try {
                const apiResults = await universitySync.searchUniversities(inputName, 1);
                if (apiResults.length > 0) {
                    return {
                        matchedName: apiResults[0].name,
                        confidence: 0.8,
                        matchType: 'api'
                    };
                }
            } catch (error) {
                console.error('API search failed:', error);
            }

            // Step 5: No good match
            return {
                matchedName: inputName,
                confidence: 0,
                matchType: 'none'
            };

        } catch (error) {
            console.error('Error in findBestMatch:', error);
            return {
                matchedName: inputName,
                confidence: 0,
                matchType: 'error'
            };
        }
    }

    async getOrCreateUniversity(name) {
        try {
            const match = await this.findBestMatch(name);

            // Try to find existing
            let university = await University.findOne({
                name: match.matchedName
            });

            if (!university) {
                // Create new
                university = await University.create({
                    name: match.matchedName,
                    normalizedName: this.normalizeName(match.matchedName)
                });
                console.log(`Created new university: ${match.matchedName}`);
            }

            return {
                university,
                match
            };
        } catch (error) {
            console.error('Error in getOrCreateUniversity:', error);
            return null;
        }
    }
}

module.exports = new UniversityMatchingService();