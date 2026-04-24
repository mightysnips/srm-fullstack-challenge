const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

//user input//
const USER_DETAILS = {
    user_id: "DharmiSharma_28012006", // Format: fullname_ddmmyyyy
    email_id: "dhaarmisharma.gbd@gmail.com",
    college_roll_number: "RA2311003030576"
};

// --- Helper Functions ---
const validateEntry = (entry) => {
    const trimmed = entry.trim();
    const regex = /^[A-Z]->[A-Z]$/;
    if (!regex.test(trimmed)) return { valid: false };
    const [p, c] = trimmed.split('->');
    if (p === c) return { valid: false }; // Self-loop
    return { valid: true, p, c, original: trimmed };
};

app.post('/bfhl', (req, res) => {
    const { data } = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ is_success: false });

    const invalid_entries = [];
    const duplicate_edges = [];
    const valid_edges = [];
    const seen_edges = new Set();
    const child_to_parent = {}; 
    const allNodes = new Set();

    data.forEach(item => {
        const validation = validateEntry(item);
        if (!validation.valid) {
            invalid_entries.push(item);
        } else {
            const edgeStr = `${validation.p}->${validation.c}`;
            if (seen_edges.has(edgeStr)) {
                if (!duplicate_edges.includes(edgeStr)) duplicate_edges.push(edgeStr);
            } else {
                seen_edges.add(edgeStr);
                // Diamond case: First parent wins
                if (!child_to_parent[validation.c]) {
                    child_to_parent[validation.c] = validation.p;
                    valid_edges.push({ p: validation.p, c: validation.c });
                    allNodes.add(validation.p);
                    allNodes.add(validation.c);
                }
            }
        }
    });

    const adj = {};
    valid_edges.forEach(({ p, c }) => {
        if (!adj[p]) adj[p] = [];
        adj[p].push(c);
    });

    const children = new Set(Object.keys(child_to_parent));
    let roots = [...allNodes].filter(n => !children.has(n)).sort();

    const visitedGlobal = new Set();
    const hierarchies = [];

    const buildTree = (node) => {
        visitedGlobal.add(node);
        const treeObj = {};
        let maxChildDepth = 0;
        if (adj[node]) {
            adj[node].sort().forEach(child => {
                const result = buildTree(child);
                treeObj[child] = result.tree;
                maxChildDepth = Math.max(maxChildDepth, result.depth);
            });
        }
        return { tree: treeObj, depth: 1 + maxChildDepth };
    };

    roots.forEach(root => {
        const { tree, depth } = buildTree(root);
        hierarchies.push({
            root,
            tree: { [root]: tree },
            depth
        });
    });

    const remainingNodes = [...allNodes].filter(n => !visitedGlobal.has(n)).sort();
    let total_cycles = 0;
    let tempNodes = new Set(remainingNodes);
    while (tempNodes.size > 0) {
        const smallest = [...tempNodes].sort()[0];
        hierarchies.push({
            root: smallest,
            tree: {},
            has_cycle: true
        });
        total_cycles++;
        
        const q = [smallest];
        const localVisited = new Set();
        while(q.length > 0){
            let curr = q.shift();
            if(!localVisited.has(curr)){
                localVisited.add(curr);
                tempNodes.delete(curr);
                if(adj[curr]) q.push(...adj[curr]);
            }
        }
    }

    const nonCyclicTrees = hierarchies.filter(h => !h.has_cycle);
    let largest_tree_root = "";
    let maxDepth = -1;

    nonCyclicTrees.forEach(h => {
        if (h.depth > maxDepth) {
            maxDepth = h.depth;
            largest_tree_root = h.root;
        } else if (h.depth === maxDepth) {
            if (h.root < largest_tree_root) largest_tree_root = h.root;
        }
    });

    res.json({
        user_id: USER_DETAILS.user_id,
        email_id: USER_DETAILS.email_id,
        college_roll_number: USER_DETAILS.college_roll_number,
        hierarchies,
        invalid_entries,
        duplicate_edges,
        summary: {
            total_trees: nonCyclicTrees.length,
            total_cycles,
            largest_tree_root
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));