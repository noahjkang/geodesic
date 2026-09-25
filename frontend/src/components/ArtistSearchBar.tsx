import React, { useEffect, useState, useRef } from 'react';
import { useUIStore, ArtistResult } from '../store/useUIStore';

// Fast external API fetcher for real artists (using iTunes Search API as a high-speed, no-auth proxy for top artists)
const searchExternalArtists = async (query: string): Promise<ArtistResult[]> => {
  if (!query) return [];
  try {
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=30`);
    const data = await response.json();
    
    const seenNames = new Set<string>();
    const uniqueArtists: ArtistResult[] = [];
    const normalizedQuery = query.toLowerCase().trim();
    
    for (const artist of data.results) {
      // Normalize the name to catch "Joon", "JOON", "joon", etc.
      const normalizedName = artist.artistName.toLowerCase().trim();
      
      // Strict matching: Ensure the artist name actually contains the search query.
      // This filters out irrelevant iTunes metadata matches (like returning a band when you search a member's name)
      if (normalizedName.includes(normalizedQuery)) {
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          uniqueArtists.push({
            id: artist.artistId.toString(),
            name: artist.artistName, // Preserve the original casing of the most popular result
          });
        }
      }
    }
    
    return uniqueArtists.slice(0, 10); // Return top 10 unique artists
  } catch (error) {
    console.error("Error fetching artists:", error);
    return [];
  }
};

const ArtistSearchBar: React.FC = () => {
  const { 
    searchQuery, setSearchQuery, 
    searchResults, setSearchResults, 
    isSearching, setIsSearching,
    selectedArtist, setSelectedArtist,
    nodes, setCameraTarget, setActiveNode
  } = useUIStore();
  
  const [inputValue, setInputValue] = useState(searchQuery);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (inputValue.trim().length > 0 && inputValue !== selectedArtist?.name) {
        setIsSearching(true);
        const results = await searchExternalArtists(inputValue);
        setSearchResults(results);
        setIsSearching(false);
        setShowDropdown(true);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, selectedArtist?.name, setSearchResults, setIsSearching]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setSearchQuery(e.target.value);
    if (selectedArtist) {
      setSelectedArtist(null); // Reset selection if they start typing again
    }
  };

  const handleSelectArtist = (artist: ArtistResult) => {
    setSelectedArtist(artist);
    setInputValue(artist.name);
    setSearchQuery(artist.name);
    setSearchResults([]);
    setShowDropdown(false);
    
    // Attempt to locate the artist in the currently loaded topological nodes
    const foundNode = nodes.find(n => n.metadata.artist_name.toLowerCase() === artist.name.toLowerCase());
    
    if (foundNode) {
      setActiveNode(foundNode.spotify_track_id, true);
      // Position the camera slightly above the node to give a good viewing angle
      setCameraTarget([foundNode.umap_x, foundNode.umap_y, 25]);
    } else {
      // If the artist isn't in our loaded 10,000 nodes, we could trigger a backend fetch here
      // For now, we'll just log it.
      console.log(`Artist ${artist.name} selected but not found in current local manifold chunk.`);
    }
  };

  return (
    <div className="w-full" ref={dropdownRef}>
      <div className="relative group">
        <div className="absolute inset-0 bg-white/5 rounded-lg blur transition-opacity"></div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
          placeholder="Search for an artist..."
          className="relative w-full bg-graphite/80 backdrop-blur-md border border-white/20 text-white p-4 pl-12 rounded-lg outline-none focus:border-cyan-400/50 transition-colors placeholder-white/30 font-mono text-sm shadow-xl"
        />
        {isSearching && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2 z-10">
            <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {showDropdown && searchResults.length > 0 && (
        <div className="absolute bottom-[calc(100%+8px)] w-full z-[100] bg-graphite/90 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden shadow-2xl">
          <ul className="max-h-60 overflow-y-auto">
            {searchResults.map((artist) => (
              <li 
                key={artist.id}
                onClick={() => handleSelectArtist(artist)}
                className="px-5 py-3.5 text-white/70 hover:bg-white/10 hover:text-cyan-400 cursor-pointer transition-colors border-b border-white/10 last:border-0 font-mono text-sm"
              >
                {artist.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {showDropdown && inputValue.trim().length > 0 && !isSearching && searchResults.length === 0 && (
        <div className="absolute bottom-[calc(100%+8px)] w-full z-[100] bg-graphite/90 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl p-5 text-center text-white/50 font-mono text-sm">
          No artists found
        </div>
      )}
    </div>
  );
};

export default ArtistSearchBar;
