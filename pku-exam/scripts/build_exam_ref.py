#!/usr/bin/env python3
"""Build a readable markdown reference from exam questions + answers JSON.

Usage:
  python build_exam_ref.py --questions exam_questions.json --answers answers.json --out exam.md

Questions JSON: a list of objects with keys id, content, question_type, order, points,
                options (list of {label, content}).
Answers JSON:   either {"answers": {id: answer, ...}} or a plain {id: answer, ...}.
                Multi-select answers use joined labels, e.g. "ABCD".
"""

import argparse
import io
import json


def load_answers(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and "answers" in data and isinstance(data["answers"], dict):
        return data["answers"]
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--questions", required=True)
    ap.add_argument("--answers", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    with open(args.questions, encoding="utf-8") as f:
        questions = json.load(f)
    answers = load_answers(args.answers)

    questions.sort(key=lambda q: q.get("order", 0))
    out = io.StringIO()
    out.write("# Exam Reference\n\n")
    out.write(f"Questions: {len(questions)}\n\n")
    for i, q in enumerate(questions, 1):
        qid = str(q["id"])
        ans = answers.get(qid, "")
        qtype = q.get("question_type", "")
        points = q.get("points", "")
        out.write(f"## Q{i} [id={qid}] [{qtype}] ({points} pts)\n\n")
        out.write(q.get("content", "").strip() + "\n\n")
        for opt in q.get("options", []):
            out.write(f"- {opt.get('label', '')}. {opt.get('content', '').strip()}\n")
        out.write(f"\n**Answer:** {ans}\n\n---\n\n")

    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        f.write(out.getvalue())
    missing = [str(q["id"]) for q in questions if str(q["id"]) not in answers]
    print(f"written {args.out} ({len(questions)} questions)")
    if missing:
        print(f"WARNING: no answer for ids: {', '.join(missing)}")


if __name__ == "__main__":
    main()
