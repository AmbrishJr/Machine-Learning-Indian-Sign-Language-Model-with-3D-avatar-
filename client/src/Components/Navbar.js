import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';

const LINKS = [
    ['/sign-kit/home', 'Home'],
    ['/sign-kit/convert', 'Convert'],
    ['/sign-kit/learn-sign', 'Learn'],
    ['/sign-kit/all-videos', 'Videos'],
    ['/sign-kit/avatar', 'Avatar'],
];

const readSavedTheme = () => {
    try {
        return localStorage.getItem('theme');
    } catch (e) {
        return null;
    }
};

function Navbar() {
    const [darkMode, setDarkMode] = useState(() => {
        // Saved preference first, otherwise follow the system setting.
        const savedTheme = readSavedTheme();
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return savedTheme ? savedTheme === 'dark' : prefersDark;
    });

    // Colours come from the design tokens in index.css, keyed off this attribute.
    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', darkMode ? 'dark' : 'light');
        try {
            localStorage.setItem('theme', darkMode ? 'dark' : 'light');
        } catch (e) {
            // Preference just isn't remembered.
        }
    }, [darkMode]);

    return (
        <nav className="navbar app-navbar navbar-expand-lg fixed-top" id="mainNav">
            <div className="container-xl px-3 px-lg-4">
                <Link to='/sign-kit/home' className="navbar-brand">
                    <span className="brand-mark"><i className="fa fa-sign-language" /></span>
                    ISL Genie
                </Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarResponsive"
                        aria-controls="navbarResponsive" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"><i className="fa fa-bars" /></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarResponsive">
                    <ul className="navbar-nav ms-auto align-items-lg-center">
                        {LINKS.map(([to, label]) => (
                            <li className="nav-item" key={to}>
                                <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>{label}</NavLink>
                            </li>
                        ))}
                        <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
                            <button
                                className="theme-toggle"
                                onClick={() => setDarkMode((d) => !d)}
                                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                                title={darkMode ? 'Light mode' : 'Dark mode'}
                            >
                                <i className={`fa ${darkMode ? 'fa-sun-o' : 'fa-moon-o'}`} />
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
