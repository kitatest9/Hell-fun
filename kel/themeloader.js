import { config } from './config.js';

export const getTheme = async () => {
    try {
        const themeModule = await import(`./themes/${config.activeTheme}.js`);
        const character = themeModule.character;
        
        const randomIndex = Math.floor(Math.random() * character.thumbnails.length);
        const imageUrl = character.thumbnails[randomIndex];

        return {
            name: character.name,
            image: imageUrl, // Sirf link bhej raha hai
            desc: character.desc,
            color: character.accentColor
        };
    } catch (e) {
        console.error("Theme Loader Error:", e);
        return {
            name: "Bot Engine",
            image: "https://i.ibb.co",
            desc: "Default Theme",
            color: "#000000"
        };
    }
};