import React from 'react'
import ThemeToggle from './ui/ThemeToggle'

const Navbar = () => {
    return (
        <div className='bg-base-100 '>
            <div className="navbar max-w-[80vw] shadow-sm mx-auto px-7 rounded-xl">
                <div className="flex-1">
                    <h1 className=" font-bold text-3xl">Nonim</h1>
                </div>
                <div className="flex-none">
                    <button className="">
                        <ThemeToggle />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Navbar;

