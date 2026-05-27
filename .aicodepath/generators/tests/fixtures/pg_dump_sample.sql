--
-- PostgreSQL database dump
--

-- Dumped from database version 14.5
-- Dumped by pg_dump version 14.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: users; Type: TABLE
--

CREATE TABLE public.users (
    id bigserial NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(100),
    created_at timestamp without time zone DEFAULT now()
);

--
-- Name: posts; Type: TABLE
--

CREATE TABLE public.posts (
    id bigserial NOT NULL,
    user_id bigint NOT NULL,
    title character varying(500) NOT NULL,
    body text,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);

--
-- Name: comments; Type: TABLE
--

CREATE TABLE public.comments (
    id bigserial NOT NULL,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--
