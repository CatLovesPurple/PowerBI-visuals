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

    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;
    import SelectionManager = utility.SelectionManager;

    export interface BoxPlotPoint {
        identity: SelectionId;
    }

    export class BoxPlot implements IVisual {

        public static capabilities: VisualCapabilities = {
            dataRoles: [{
                name: 'Values',
                kind: VisualDataRoleKind.GroupingOrMeasure,
            }, ],
            dataViewMappings: [{
                table: {
                    rows: {
                        for: {
							in: 'Values'
                        },
                        dataReductionAlgorithm: {
                            window: {}
                        }
                    },
                    rowCount: {
                        preferred: {
                            min: 1
                        }
                    }
                },
            }],
            objects: {
                general: {
                    displayName: data.createDisplayNameGetter('Visual_General'),
                    properties: {
                        formatString: {
                            type: {
                                formatting: {
                                    formatString: true
                                }
                            },
                        },
                    },
                },
                label: {
                    displayName: 'Label',
                    properties: {
                        fill: {
                            displayName: 'Fill',
                            type: {
                                fill: {
                                    solid: {
                                        color: true
                                    }
                                }
                            }
                        }
                    }
                },
            }
        };

        private element: JQuery;
        private svg: D3.Selection;
        private width: number;
        private height: number;
        private margin: IMargin = {
            top: 20,
            right: 0,
            bottom: 20,
            left: 60
        };
        private max: number = -Infinity;
        private min: number = Infinity;
        //private viewport: IViewport;
        private static BoxChart: ClassAndSelector = createClassAndSelector('boxChart');
        private static Axis: ClassAndSelector = createClassAndSelector('axis');

        private selectionManager: SelectionManager;
        private boxChart: D3.Selection;
		private columnNames: string[] = new Array();

        // Convert a DataView into a view model
        public converter(dataView: DataView): any {
            if (!dataView || !dataView.table || !dataView.categorical) return;

            var rowMaxArr = [];
            var rowMinArr = [];
            var data = [];
            var rawDataRows = dataView.table.rows;
            var colnames: string[] = [];
            var columnLength: number = dataView.table.columns.length;

            //populate column names
            dataView.metadata.columns.forEach(function (item) {
                colnames.push(item.queryName);
            });

			this.columnNames = colnames;

            for (var i = 0; i < columnLength; i++) {
                data[i] = [];
                data[i][0] = colnames[i];
                var arrval: number[] = [];
                for (var j = 0; j < rawDataRows.length; j++) {
                    arrval.push(rawDataRows[j][i]);
                }
                data[i][1] = arrval;
            }

            for (var j = 0; j < data.length; j++) {
                var item = data[j][1];
                rowMaxArr.push(_.max(item));
                rowMinArr.push(_.min(item));
            }

            this.max = _.max(rowMaxArr);
            this.min = _.min(rowMinArr);

            return data;
        }

        public init(options: VisualInitOptions): void {
            this.selectionManager = new SelectionManager({
                hostServices: options.host
            });
            this.element = options.element;
            this.width = options.viewport.width;
            this.height = options.viewport.height;
            this.svg = d3.select(this.element.get(0)).append("svg").classed(BoxPlot.BoxChart.class, true);
        }

        public update(options: VisualUpdateOptions) {
            if (!options.dataViews || !options.dataViews[0]) return;

            var w = options.viewport.width - this.margin.left - this.margin.right;
            var h = options.viewport.height - this.margin.top - this.margin.bottom;

            if (this.svg.selectAll("g").length !== 0) {
                this.svg.selectAll("g").remove();
            }

			var data = this.converter(options.dataViews[0]);

            this.svg.attr("width", w + this.margin.left + this.margin.right)
                .attr("height", h + this.margin.top + this.margin.bottom)
                .classed(BoxPlot.BoxChart.class, true)
                .append("g");

            this.drawAxis(this.columnNames, w, h);
            this.drawBox(this.columnNames, data, h, w);
        }

        private drawAxis(arr: string[], w: number, h: number) {
            var xScale: D3.Scale.OrdinalScale = d3.scale.ordinal()
                .domain(arr)
                .rangeRoundBands([this.margin.left, w], 0.7, 0.3);

            var yScale: D3.Scale.LinearScale = d3.scale.linear()
                .domain([this.min, this.max])
                .range([h + this.margin.top, this.margin.top]);

            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom");

            var yAxis = d3.svg.axis()
                .scale(yScale)
                .orient("left");

            this.svg.append("g")
                .attr("class", "axis")
                .attr('transform', SVGUtil.translate(this.margin.left, 0))
                .call(yAxis)
                .classed(BoxPlot.Axis.class, true);

            // draw x axis	
            this.svg.append("g")
                .attr("class", "axis")
                .attr('transform', SVGUtil.translate(0, this.margin.top + h))
                .call(xAxis)
                .classed(BoxPlot.Axis.class, true);
        }

        private drawBox(arr: string[], data: any, h: number, w: number) {
            var xScale: D3.Scale.OrdinalScale = d3.scale.ordinal()
                .domain(arr)
                .rangeRoundBands([this.margin.left, w], 0.7, 0.3);

            var box = new Box();

            var chart = box.fo
                .whiskers(this.iqr(1.5))
                .height(h)
                .domain([this.min, this.max])
                .showLabels(true);

            var selection = this.svg.selectAll(BoxPlot.BoxChart.selector).data(data);

            // draw the boxplots	
            selection
                .enter().append("g")
                .attr("class", function (d, i) {
					return "greenbox";
                })
                .attr("transform", function (d) {
                    return "translate(" + xScale(d[0]) + ")";
                })
                .call(chart.width(xScale.rangeBand()))
                .on("click", function (d, i) {
                    var clickedBox = this;
                    d3.select(this).transition().duration(2);

                    var boxes = d3.selectAll("greenbox");
                    boxes.filter(function (x) {
						return self !== this;
					})
                        .transition().duration(1)
                        .style('fill-opacity', 0.2);
                    //  console.log(i)
                    // //  console.log(d)
                    //  if (!d.highlighted){

                    // 	d3.select(this).transition()
                    //         .duration(2)
                    //         .style('fill-opacity', 1);
                    //  }
                    // else{
                    //     d3.selectAll(".box-" + i)
                    //         .style('fill-opacity', 1);

                    d.highlighted = d.highlighted ? false : true;
                });

            selection.exit().remove();
        }

        private iqr(k: number): any {
            return function (d: any, i: number) {
                var q1 = d.quartiles[0],
                    q3 = d.quartiles[2],
                    iqr = (q3 - q1) * k,
                    i = -1,
                    j = d.length;
                while (d[++i] < q1 - iqr);
                while (d[--j] > q3 + iqr);
                return [i, j];
            };
        }

        // private setSize(viewport: IViewport): void {
        //     var height: number,
        //         width: number;

        //     height = viewport.height - this.margin.top - this.margin.bottom;
        //     width = viewport.width - this.margin.left - this.margin.right;

        //     this.viewport = {
        //         height: height,
        //         width: width
        //     };

        //     this.updateElements(viewport.height, viewport.width);
        // }

        // private updateElements(height: number, width: number): void {
        //     this.svg.attr({
        //         'height': height,
        //         'width': width
        //     });
        //     this.svg.attr('transform', SVGUtil.translate(this.margin.left, this.margin.top));
        //     this.axisY.attr('transform', SVGUtil.translate(this.margin.left, this.margin.top));
        //     this.axisX.attr('transform', SVGUtil.translate(this.margin.left, this.margin.top + this.viewport.height));
        // }

        /*About to remove your visual, do clean up here */
        public destroy() { }
    }

    export class Box {
        public fo = (() => {
            var width = 1,
                height = 1,
                duration = 0,
                domain = null,
                value = Number,
                whiskers = function (d) {
                    return [0, d.length - 1];
                },
                quartiles = function (d) {
                    return [
                        d3.quantile(d, .25),
                        d3.quantile(d, .5),
                        d3.quantile(d, .75)
                    ];
                },

                showLabels = true, // whether or not to show text labels
                numBars = 4,
                curBar = 1,
                tickFormat = null;

            var _box: any = function (g: any) {
                g.each(function (data, i) {
                    //d = d.map(value).sort(d3.ascending);
                    //var boxIndex = data[0];
                    //var boxIndex = 1;
                    var d = data[1].sort(d3.ascending);

                    // console.log(boxIndex); 
                    //console.log(d); 

                    var g = d3.select(this),
                        n = d.length,
                        min = d[0],
                        max = d[n - 1];

                    // Compute quartiles. Must return exactly 3 elements.
                    var quartileData = d.quartiles = quartiles(d);

                    // Compute whiskers. Must return exactly 2 elements, or null.
                    var whiskerIndices = whiskers && whiskers.call(this, d, i),
                        whiskerData = whiskerIndices && whiskerIndices.map(function (i) {
                            return d[i];
                        });

                    // Compute outliers. If no whiskers are specified, all data are "outliers".
                    // We compute the outliers as indices, so that we can join across transitions!
                    var outlierIndices = whiskerIndices ? d3.range(0, whiskerIndices[0]).concat(d3.range(whiskerIndices[1] + 1, n)) : d3.range(n);

                    // Compute the new x-scale.
                    var x1 = d3.scale.linear()
                        .domain(domain && domain.call(this, d, i) || [min, max])
                        .range([height, 0]);

                    // Retrieve the old x-scale, if this is an update.
                    var x0 = this.__chart__ || d3.scale.linear()
                        .domain([0, Infinity])
					// .domain([0, max])
                        .range(x1.range());

                    // Stash the new scale.
                    this.__chart__ = x1;

                    // Note: the box, median, and box tick elements are fixed in number,
                    // so we only have to handle enter and update. In contrast, the outliers
                    // and other elements are variable, so we need to exit them! Variable
                    // elements also fade in and out.

                    // Update center line: the vertical line spanning the whiskers.
                    var center = g.selectAll("line.center")
                        .data(whiskerData ? [whiskerData] : []);

                    //vertical line
                    center.enter().insert("line", "rect")
                        .attr("class", "center")
                        .attr("x1", width / 2)
                        .attr("y1", function (d) {
                            return x0(d[0]);
                        })
                        .attr("x2", width / 2)
                        .attr("y2", function (d) {
                            return x0(d[1]);
                        })
                        .style("opacity", 1e-6)
                        .transition()
                        .duration(duration)
                        .style("opacity", 1)
                        .attr("y1", function (d) {
                            return x1(d[0]);
                        })
                        .attr("y2", function (d) {
                            return x1(d[1]);
                        });

                    center.transition()
                        .duration(duration)
                        .style("opacity", 1)
                        .attr("y1", function (d) {
                            return x1(d[0]);
                        })
                        .attr("y2", function (d) {
                            return x1(d[1]);
                        });

                    center.exit().transition()
                        .duration(duration)
                        .style("opacity", 1e-6)
                        .attr("y1", function (d) {
                            return x1(d[0]);
                        })
                        .attr("y2", function (d) {
                            return x1(d[1]);
                        })
                        .remove();

                    // Update innerquartile box.
                    var box = g.selectAll("rect.box")
                        .data([quartileData]);

                    box.enter().append("rect")
                        .attr("class", "box")
                        .attr("x", 0)
                        .attr("y", function (d) {
                            return x0(d[2]);
                        })
                        .attr("width", width)
                        .attr("height", function (d) {
                            return x0(d[0]) - x0(d[2]);
                        })
                        .transition()
                        .duration(duration)
                        .attr("y", function (d) {
                            return x1(d[2]);
                        })
                        .attr("height", function (d) {
                            return x1(d[0]) - x1(d[2]);
                        });

                    box.transition()
                        .duration(duration)
                        .attr("y", function (d) {
                            return x1(d[2]);
                        })
                        .attr("height", function (d) {
                            return x1(d[0]) - x1(d[2]);
                        });

                    // Update median line.
                    var medianLine = g.selectAll("line.median")
                        .data([quartileData[1]]);

                    medianLine.enter().append("line")
                        .attr("class", "median")
                        .attr("x1", 0)
                        .attr("y1", x0)
                        .attr("x2", width)
                        .attr("y2", x0)
                        .transition()
                        .duration(duration)
                        .attr("y1", x1)
                        .attr("y2", x1);

                    medianLine.transition()
                        .duration(duration)
                        .attr("y1", x1)
                        .attr("y2", x1);

                    // Update whiskers.
                    var whisker = g.selectAll("line.whisker")
                        .data(whiskerData || []);

                    whisker.enter().insert("line", "circle, text")
                        .attr("class", "whisker")
                        .attr("x1", 0)
                        .attr("y1", x0)
                        .attr("x2", 0 + width)
                        .attr("y2", x0)
                        .style("opacity", 1e-6)
                        .transition()
                        .duration(duration)
                        .attr("y1", x1)
                        .attr("y2", x1)
                        .style("opacity", 1);

                    whisker.transition()
                        .duration(duration)
                        .attr("y1", x1)
                        .attr("y2", x1)
                        .style("opacity", 1);

                    whisker.exit().transition()
                        .duration(duration)
                        .attr("y1", x1)
                        .attr("y2", x1)
                        .style("opacity", 1e-6)
                        .remove();

                    // Compute the tick format.
                    var format = tickFormat || x1.tickFormat(8);

                    // Update box ticks.
                    var boxTick = g.selectAll("text.box")
                        .data(quartileData);
                    if (showLabels === true) {
                        boxTick.enter().append("text")
                            .attr("class", "box")
                            .attr("dy", ".3em")
                            .attr("dx", function (d, i) {
								return i & 1 ? 6 : -6;
                            })
                            .attr("x", function (d, i) {
								return i & 1 ? +width : 0;
                            })
                            .attr("y", x0)
                            .attr("text-anchor", function (d, i) {
                                return i & 1 ? "start" : "end";
                            })
                            .text(format)
                            .transition()
                            .duration(duration)
                            .attr("y", x1);
                    }

                    boxTick.transition()
                        .duration(duration)
                        .text(format)
                        .attr("y", x1);

                    // Update whisker ticks. These are handled separately from the box
                    // ticks because they may or may not exist, and we want don't want
                    // to join box ticks pre-transition with whisker ticks post-.
                    var whiskerTick = g.selectAll("text.whisker")
                        .data(whiskerData || []);

					if (showLabels === true) {
                        whiskerTick.enter().append("text")
                            .attr("class", "whisker")
                            .attr("dy", ".3em")
                            .attr("dx", 6)
                            .attr("x", width)
                            .attr("y", x0)
                            .text(format)
                            .style("opacity", 1e-6)
                            .transition()
                            .duration(duration)
                            .attr("y", x1)
                            .style("opacity", 1);
                    }
                    whiskerTick.transition()
                        .duration(duration)
                        .text(format)
                        .attr("y", x1)
                        .style("opacity", 1);

                    whiskerTick.exit().transition()
                        .duration(duration)
                        .attr("y", x1)
                        .style("opacity", 1e-6)
                        .remove();
                });
                d3.timer.flush();
            };

            _box.width = function (x) {
                if (!arguments.length) {
                    return width;
                }
                width = x;
                return _box;
            };

            _box.height = function (x) {
                if (!arguments.length) {
					return height;
				}
                height = x;
                return _box;
            };

            _box.tickFormat = function (x) {
                if (!arguments.length) return tickFormat;
                tickFormat = x;
                return _box;
            };

            _box.duration = function (x) {
                if (!arguments.length) return duration;
                duration = x;
                return _box;
            };

            _box.domain = function (x) {
                if (!arguments.length) return domain;
                domain = x == null ? x : d3.functor(x);
                return _box;
            };

            _box.value = function (x) {
                if (!arguments.length) return value;
                value = x;
                return _box;
            };

            _box.whiskers = function (x) {
                if (!arguments.length) return whiskers;
                whiskers = x;
                return _box;
            };

            _box.showLabels = function (x) {
                if (!arguments.length) return showLabels;
                showLabels = x;
                return _box;
            };

            _box.quartiles = function (x) {
                if (!arguments.length) return quartiles;
                quartiles = x;
                return _box;
            };
            return _box;
        })();

        private boxWhiskers(d: any): any {
            return [0, d.length - 1];
        }

        private boxQuartiles(d: any): any {
            return [
                d3.quantile(d, .25),
                d3.quantile(d, .5),
                d3.quantile(d, .75)
            ];
        }
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
