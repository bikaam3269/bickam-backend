/**
 * Helper functions for image/file path handling
 * Converts filenames to relative paths (e.g., /files/image.png)
 */

/**
 * Construct image/file path from filename
 * @param {string} filename - Image or file filename
 * @returns {string|null} - Relative path (e.g., /files/image.png) or null
 */
export const getImagePath = (filename) => {
  if (!filename) return null;
  
  // If already a full URL, extract the path
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    try {
      const url = new URL(filename);
      return url.pathname;
    } catch (e) {
      // If URL parsing fails, treat as filename
      return `/files/${filename}`;
    }
  }
  
  // If starts with /files/, return as is
  if (filename.startsWith('/files/')) {
    return filename;
  }
  
  // Otherwise, it's just a filename, add /files/ prefix
  return `/files/${filename}`;
};

/**
 * Convert array of image/file filenames to paths
 * @param {Array<string>} files - Array of filenames
 * @returns {Array<string>} - Array of relative paths
 */
export const convertFilesToPaths = (files) => {
  if (!files || !Array.isArray(files)) {
    return [];
  }
  return files.map(file => getImagePath(file)).filter(path => path !== null);
};

