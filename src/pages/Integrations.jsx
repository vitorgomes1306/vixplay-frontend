import React from 'react'
import { DndContext, useDraggable } from "@dnd-kit/core";

function Card() {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "card"
  });

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    width: 200,
    padding: 20,
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
  };

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}>
      Arraste o card
    </div>
  );
}

const Integrations = () => {
  return (
   <DndContext>
      <Card />
    </DndContext>
  )
}

export default Integrations