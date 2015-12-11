/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/* Please make sure that this path is correct */
/// <reference path="../_references.ts"/>

module powerbi.visuals {

    export interface MyViewModel { };

    export class BoxPlot implements IVisual {
		/**
		  * Informs the System what it can do
		  * Fields, Formatting options, data reduction & QnA hints
		  */
		public static capabilities: VisualCapabilities = {
			dataRoles: [
                {
                    name: 'Values',
                    kind: VisualDataRoleKind.GroupingOrMeasure,
                },
            ],
			dataViewMappings: [{
                table: {
                    rows: {
                        for: { in: 'Values' },
                        dataReductionAlgorithm: { window: {} }
                    },
                    rowCount: { preferred: { min: 1 } }
                },
            }],
			objects: {
				general: {
					displayName: data.createDisplayNameGetter('Visual_General'),
					properties: {
						formatString: {
							type: { formatting: { formatString: true } },
						},
					},
				},
				label: {
					displayName: 'Label',
					properties: {
						fill: {
							displayName: 'Fill',
							type: { fill: { solid: { color: true } } }
						}
					}
				},
			}
		};

        private element: JQuery;

        // Convert a DataView into a view model
        public static converter(dataView: DataView): MyViewModel {
            return {};
        }

        /* One time setup*/
        public init(options: VisualInitOptions): void {
            this.element = options.element;
        }

        /* Called for data, size, formatting changes*/ 
        public update(options: VisualUpdateOptions) {}

        /*About to remove your visual, do clean up here */ 
        public destroy() {}
    }
}

/* Creating IVisualPlugin that is used to represent IVisual. */
//
// Uncomment it to see your plugin in "PowerBIVisualsPlayground" plugins list
// Remember to finally move it to plugins.ts
//
//module powerbi.visuals.plugins {
//    export var boxPlot: IVisualPlugin = {
//        name: 'boxPlot',
//        capabilities: boxPlot.capabilities,
//        create: () => new boxPlot()
//    };
//}