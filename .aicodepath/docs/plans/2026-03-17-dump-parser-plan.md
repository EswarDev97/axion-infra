# Implementation Plan: DumpParser for ER Diagram Generation

**Goal**: Add DumpParser with content sniffing so ERDiagramGenerator correctly handles pg_dump, mysqldump, and SQLite schema dumps with clear error messages on invalid input.
**Design doc**: `.aicodepath/docs/plans/2026-03-17-dump-parser-design.md`
**Estimated tasks**: 10
**Tech stack**: Python 3, sqlparse, re, pydantic

## Architecture Notes

- Content sniffing in `file_analyzer.detect_language()` — reads first 50 lines, returns "pgdump"/"mysqldump"/"sqlite_dump"
- `get_parser()` maps dialect languages → `DumpParser(dialect)`
- `DumpParser` three-stage pipeline: strip preamble → extract tables+FKs → normalize types
- `DiagramOutput` gains `errors: List[str]` — ValueError routed to errors[], unexpected exceptions to warnings[]
- ERDiagramGenerator checks errors after analyze_files(), returns early with confidence=0.0 if any

## Tasks

| Task | Content | DoD | Depends | Status |
|------|---------|-----|---------|--------|
| 1. Add `errors` field to `DiagramOutput` | In `.aicodepath/generators/core/base_generator.py`: add `errors: List[str] = []` to `DiagramOutput`; add `_add_error(msg)` and `_get_errors() -> List[str]` to `BaseGenerator`; update `analyze_files()` catch block to route `ValueError` → `_add_error()`, other exceptions → `_add_warning()` | `python3 -c "from generators.core.base_generator import DiagramOutput; d=DiagramOutput(mermaid_code='x',confidence_score=0,metadata={},source_files=[]); assert hasattr(d,'errors')"` exits 0 | — | TODO |
| 2. Create test fixtures | Create `tests/fixtures/pg_dump_sample.sql` (3 tables + 2 ALTER TABLE ONLY FK constraints + pg_dump header), `tests/fixtures/mysql_dump_sample.sql` (3 tables + inline FKs + /*!40101 comments), `tests/fixtures/sqlite_dump_sample.sql` (2 tables + PRAGMA foreign_keys=OFF + BEGIN TRANSACTION) | `test -s .aicodepath/generators/tests/fixtures/pg_dump_sample.sql && test -s .aicodepath/generators/tests/fixtures/mysql_dump_sample.sql && test -s .aicodepath/generators/tests/fixtures/sqlite_dump_sample.sql` exits 0 | — | TODO |
| 3. Write `test_content_sniffing.py` + implement `sniff_sql_content()` | Test first in `tests/test_content_sniffing.py`: pg fixture → "pgdump", mysql fixture → "mysqldump", sqlite fixture → "sqlite_dump", empty string → ValueError, unrecognized content → None. Then add `sniff_sql_content(content: str) -> Optional[str]` to `file_analyzer.py` | `python3 .aicodepath/generators/tests/test_content_sniffing.py` exits 0 | 2 | TODO |
| 4. Wire sniffing into `detect_language()` and `get_parser()` | In `file_analyzer.py`: `detect_language()` accepts optional `content: str = None`; calls `sniff_sql_content(content)` for `.sql` files and returns dialect language if matched. `get_parser()` adds 3 branches: `"pgdump"/"mysqldump"/"sqlite_dump"` → `DumpParser(dialect)` | `python3 -c "from generators.core.file_analyzer import FileAnalyzer; a=FileAnalyzer(); assert a.get_parser('pgdump') is not None"` exits 0 | 3 | TODO |
| 5. Write `test_dump_parser.py` (RED) | Create `tests/test_dump_parser.py` asserting: `DumpParser("postgresql").parse(pg_content)` → 3 tables + 2 FK edges; `DumpParser("mysql").parse(mysql_content)` → 3 tables; `DumpParser("sqlite").parse(sqlite_content)` → 2 tables; empty content → ValueError; data-only (no CREATE TABLE) → ValueError with "data-only" in message | `python3 .aicodepath/generators/tests/test_dump_parser.py` exits 1 (ImportError — class not yet defined) | 2 | TODO |
| 6. Implement `DumpParser._strip_preamble()` + `_extract_tables()` | Create `.aicodepath/generators/parsers/dump_parser.py`: `DumpParser(dialect)` with `parser_type="regex"`, `_strip_preamble(content)` per dialect (pg: SET/SELECT pg_catalog/comments; mysql: /*!…*/+LOCK TABLES; sqlite: PRAGMA/BEGIN/COMMIT), `_extract_tables(clean)` regex returning `List[Dict]` | strip+extract tests in `test_dump_parser.py` pass | 5 | TODO |
| 7. Implement `_extract_alter_fks()` + `_normalize_types()` | Add `_extract_alter_fks(content)` parsing `ALTER TABLE ONLY t ADD CONSTRAINT ... FOREIGN KEY (col) REFERENCES t2(col)` for pg+mysql; add `_normalize_types(col_type: str) -> str` mapping bigserial→INTEGER, uuid→VARCHAR, jsonb→TEXT, tinyint(1)→BOOLEAN, datetime→TIMESTAMP | FK tests pass (2 edges from pg fixture); normalize tests pass for all 5 type mappings | 6 | TODO |
| 8. Implement `DumpParser.parse()` + export | Wire `parse(content)` calling strip→extract_tables+alter_fks→normalize→return dict; add ValueError for empty/truncated/data-only; export `DumpParser` from `parsers/__init__.py` | `python3 .aicodepath/generators/tests/test_dump_parser.py` exits 0 — all tests pass | 7 | TODO |
| 9. Add `_parse_dump_output()` + dispatch to `ERDiagramGenerator` | In `er_diagram.py`: add `_parse_dump_output(analyzed_file)` mapping `parsed_data["tables"]+["foreign_keys"]` → `self.entities{}`; update `.sql` dispatch to check `analyzed_file.language` → `_parse_dump_output()` for dump languages; add early error return after `analyze_files()` using `_get_errors()` | `python3 -c "from generators.diagrams.er_diagram import ERDiagramGenerator; print('import ok')"` exits 0; early-error path reachable | 8 | TODO |
| 10. Write `test_er_dump_integration.py` + verify end-to-end | Create `tests/test_er_dump_integration.py`: pg fixture → confidence≥0.7, errors=[], ≥2 FK relationships in mermaid; mysql+sqlite fixtures → errors=[]; empty file → errors non-empty, confidence=0.0 | `python3 .aicodepath/generators/tests/test_er_dump_integration.py` exits 0 | 9 | TODO |
