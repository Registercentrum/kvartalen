/**
 * @callback ExportChart~drawPicRenderer
 * @param {CanvasRenderingContext2D} ctx - The current canvas context
 * @param {object} dimensions - Dimensions of the chart and canvas to take into consideration. 
 */
/**
 * @typedef {Object} FontDefinition                     
 * @property {string} [size]
 * @property {string} [family]
 */
/**
 * @typedef {Object} DataGetterDefinition
 * @property {string} [title] - The title to display in the table
 * @property {string} [key] - The key to use when getting the data.
 */
/**
 * @typedef {Object} SectionDefinition                     
 * @property {number} [height] - Height of the section.
 * @property {string[]} [items] - Lines of text to draw out.
 * @property {ExportChart~drawPicRenderer} [renderer] - A rendering function fo rmore complex scenarios
 * @property {FontDefinition} [font] - What font the section should use
 * @property {DataGetterDefinition[]} [keys] - Passed to allow getting data from the store into a table, can only be used with a table section.
 */
/**
 * @typedef {Object} GeneratePictureConfig                     
 * @property {number} [padding] - a padding to be used around the picture
 * @property {SectionDefinition} [header]
 * @property {SectionDefinition} [table]
 * @property {SectionDefinition} [footer]
 */
/**
 * @function ExportChart~generatePicture
 * @param {GeneratePictureConfig} config 
 * @returns {string} dataUrl/png
 */

/**
 * @class 
 * @name ExportChart
 */