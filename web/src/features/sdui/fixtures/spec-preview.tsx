'use client';

import { NodeView } from '../nodes/node-view';
import { SPEC_PREVIEW_NODES } from './spec-nodes';

/** Події з прев'ю лише логуються: сервера в dev-сторінці немає. */
export function SpecPreview() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      {SPEC_PREVIEW_NODES.map((node) => (
        <NodeView
          key={node.id}
          node={node}
          onEvent={async (event) => {
            console.log('[sdui-preview]', event);
          }}
        />
      ))}
    </main>
  );
}
