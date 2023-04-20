import { CtxAsync as Ctx, useQuery } from "@vlcn.io/react";
import React from "react";
import { Event } from "./TodoList";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import nodeHtmlLabel from "cytoscape-node-html-label";

cytoscape.use(dagre);
nodeHtmlLabel(cytoscape);

export default function DagStateGraph({
  ctx,
  nodeName,
}: {
  ctx: Ctx;
  nodeName: string;
}) {
  const chart = useQuery(
    ctx,
    `SELECT
      event_dag.parent_id as parentId,
      event_dag.event_id as eventId,
      event.type as type,
      event.item_id as itemId,
      event.value as value
    FROM event_dag
    JOIN event ON event.id = event_dag.event_id`,
    [],
    (
      rows: {
        parentId: any;
        eventId: bigint;
        itemId: bigint;
        type: Event["type"];
        value: any;
        text: string;
      }[]
    ) => {
      const nodes = [
        {
          data: {
            id: "ROOT",
            label: "ROOT",
          },
        },
      ];
      const edges = [];
      for (const row of rows) {
        nodes.push({
          data: {
            id: row.eventId.toString(),
            label: `${(row.itemId || "").toString().slice(-4)}: [${row.type}, ${
              row.value
            }]`,
          },
        });
        if (row.parentId) {
          edges.push({
            data: {
              source: row.parentId.toString(),
              target: row.eventId.toString(),
            },
          });
        }
      }

      return {
        nodes,
        edges,
      };
    }
  ).data;

  const [cy, setCy] = React.useState<cytoscape.Core | null>(null);
  const [lastChart, setLastChart] = React.useState<any>(chart);

  const root = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!root.current) {
      return;
    }

    const aCy = cytoscape({
      container: root.current,
      elements: chart,
      boxSelectionEnabled: false,
      autounselectify: true,

      layout: {
        name: "dagre",
      },

      style: [
        {
          selector: "node",
          style: {
            "background-color": "#11479e",
          },
        },

        {
          selector: "edge",
          style: {
            width: 4,
            "target-arrow-shape": "triangle",
            "line-color": "#9dbaea",
            "target-arrow-color": "#9dbaea",
            "curve-style": "bezier",
          },
        },
      ],
    });
    aCy.nodeHtmlLabel([
      {
        query: "node",
        halign: "center",
        valign: "center",
        halignBox: "center",
        valignBox: "center",
        cssClass: "dag-label",
        tpl(data: any) {
          return "<span>" + data.label + "</span>"; // your html template here
        },
      },
    ]);
    setCy(aCy);
  }, [root.current]);

  React.useEffect(() => {
    if (!cy) {
      return;
    }

    cy.elements().remove();
    cy.add(chart);
    cy.layout({ name: "dagre" }).run();
    cy.center();
    cy.fit();
    // setLastChart(chart);
  }, [cy, chart]);

  return (
    <>
      <h2>DAG - {nodeName}</h2>
      <div
        style={{
          width: 425,
          height: 500,
          position: "relative",
          background: "black",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
          }}
        ></div>
        <div
          ref={(el) => {
            root.current = el;
          }}
          style={{ width: 425, height: 500 }}
        ></div>
      </div>
    </>
  );
}
